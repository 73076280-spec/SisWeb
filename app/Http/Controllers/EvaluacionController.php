<?php

namespace App\Http\Controllers;

use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\GeoLocationService;
use App\Services\ItseRiskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class EvaluacionController extends Controller
{
    protected ItseRiskService $riskService;

    protected GeoLocationService $geoLocationService;

    public function __construct(ItseRiskService $riskService, GeoLocationService $geoLocationService)
    {
        $this->riskService = $riskService;
        $this->geoLocationService = $geoLocationService;
    }

    public function index()
    {
        return Inertia::render('Evaluacion/Index', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre_comercio' => 'required|string|max:255',
            'funcion_economica' => 'required|string',
            'ruc' => ['required', 'string', 'regex:/^(10|20)\d{9}$/'],
            'sector' => 'required|string',
            'area_m2' => 'required|numeric|min:1',
            'pisos' => 'required|integer|min:1',
            'aforo' => 'required|integer|min:1',
            'usa_glp' => 'boolean',
            'galones_glp' => 'nullable|numeric',
            'usa_caldero' => 'nullable|boolean',
            'usa_liquidos_inflamables' => 'nullable|boolean',
            'checklist' => 'required|array|min:1',
        ]);

        $clasificacion = $this->riskService->clasificarTramite(
            funcion: $validated['funcion_economica'],
            areaM2: (float) $validated['area_m2'],
            pisos: (int) $validated['pisos'],
            aforo: (int) $validated['aforo'],
            usaGlp: (bool) ($validated['usa_glp'] ?? false),
            galonesGlp: (float) ($validated['galones_glp'] ?? 0),
            usaCaldero: (bool) ($validated['usa_caldero'] ?? false),
            usaLiquidosInflamables: (bool) ($validated['usa_liquidos_inflamables'] ?? false)
        );

        $conformidad = $this->riskService->calcularConformidad($validated['checklist']);
        $planAccion = $this->riskService->generarPlanDeAccion($validated['checklist']);

        $uuid = (string) Str::uuid();
        $hashIntegridad = hash('sha256', $uuid.$validated['ruc'].now()->timestamp);

        $autoevaluacion = Autoevaluacion::create([
            'user_id' => Auth::id(),
            'session_token' => $request->cookie('guest_session_token'),
            'uuid_trazabilidad' => $uuid,
            'hash_integridad' => $hashIntegridad,
            'nombre_comercio' => $validated['nombre_comercio'],
            'funcion_economica' => $validated['funcion_economica'],
            'ruc' => $validated['ruc'],
            'sector_huancayo' => $validated['sector'],
            'area_m2' => $validated['area_m2'],
            'pisos' => $validated['pisos'],
            'aforo' => $validated['aforo'],
            'usa_glp' => (bool) ($validated['usa_glp'] ?? false),
            'galones_glp' => $validated['galones_glp'] ?? 0,
            'usa_caldero' => (bool) ($validated['usa_caldero'] ?? false),
            'usa_liquidos_inflamables' => (bool) ($validated['usa_liquidos_inflamables'] ?? false),
            'tipo_tramite' => $clasificacion['tipo_tramite'],
            'nivel_riesgo' => $clasificacion['nivel_riesgo'],
            'porcentaje_cumplimiento' => $conformidad['porcentaje'],
            'semaforo' => $conformidad['semaforo'],
            'detalle_checklist' => $validated['checklist'],
            'plan_accion_costos' => $planAccion,
        ]);

        return redirect()->route('autoevaluacion.resultado', ['uuid' => $autoevaluacion->uuid_trazabilidad]);
    }

    public function resultado(string $uuid)
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        return Inertia::render('Evaluacion/Resultado', [
            'autoevaluacion' => $autoevaluacion,
        ]);
    }

    public function simulacionRevision(string $uuid)
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        return Inertia::render('Evaluacion/SimulacionRevision', [
            'autoevaluacion' => $autoevaluacion,
        ]);
    }

    public function guardarSimulacion(Request $request, string $uuid)
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        $validated = $request->validate([
            'verificaciones' => 'required|array',
            'discrepancias' => 'required|integer|min:0',
        ]);

        $verificaciones = $validated['verificaciones'];
        $checklist = $autoevaluacion->detalle_checklist;

        $totalEvaluables = 0;
        $totalConformeEnRevision = 0;

        foreach ($checklist as $item) {
            $codigo = $item['codigo'];
            $estadoDeclarado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');

            if ($estadoDeclarado !== 'NA') {
                $totalEvaluables++;
                $conformeEnCampo = ! empty($verificaciones[$codigo]);
                if ($conformeEnCampo) {
                    $totalConformeEnRevision++;
                }
            }
        }

        $porcentajeRevision = $totalEvaluables > 0
            ? round(($totalConformeEnRevision / $totalEvaluables) * 100, 1)
            : 100.0;

        $metricaGap = $this->riskService->calcularMetricaGap(
            $autoevaluacion->porcentaje_cumplimiento,
            $porcentajeRevision
        );

        $resultado = $validated['discrepancias'] === 0 ? 'SIN_OBSERVACIONES' : 'CON_OBSERVACIONES';
        $codigoRevision = 'PREV-ITSE-'.date('Y').'-'.strtoupper(Str::random(6));

        SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => $codigoRevision,
            'total_observaciones' => (int) $validated['discrepancias'],
            'porcentaje_revision' => $porcentajeRevision,
            'metrica_gap' => $metricaGap,
            'resultado' => $resultado,
            'detalle_revision' => $verificaciones,
        ]);

        return redirect()->route('autoevaluacion.simulacion', ['uuid' => $uuid]);
    }

    public function panelSubsanacion(string $uuid)
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $ultimaRevision = $autoevaluacion->simulaciones()->latest()->first();

        return Inertia::render('Evaluacion/Subsanacion', [
            'autoevaluacion' => $autoevaluacion,
            'ultimaRevision' => $ultimaRevision ? $ultimaRevision->load('subsanaciones') : null,
        ]);
    }

    public function guardarSubsanacion(Request $request, string $uuid)
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $revision = $autoevaluacion->simulaciones()->latest()->firstOrFail();

        $validated = $request->validate([
            'codigo_item' => 'required|string',
            'descripcion_subsanacion' => 'required|string|min:5|max:1000',
            'estado' => 'nullable|in:PENDIENTE,EN_PROCESO,SUBSANADO_DECLARADO',
            'observacion' => 'nullable|string|max:1000',
            'evidencia' => ['nullable', 'file', 'mimes:jpeg,png,pdf', 'max:5120'],
        ]);

        $estadoSubsanacion = $validated['estado'] ?? 'PENDIENTE';

        $subsanacion = Subsanacion::firstOrNew([
            'simulacion_revision_id' => $revision->id,
            'codigo_item' => $validated['codigo_item'],
        ]);

        $estadoAnterior = $subsanacion->exists ? $subsanacion->estado : 'PENDIENTE';

        $evidenciaUrl = null;
        if ($request->hasFile('evidencia')) {
            $evidenciaUrl = Storage::disk('public')->putFile('evidencias/subsanaciones', $request->file('evidencia'));
        }

        $subsanacion->fill([
            'descripcion' => $validated['descripcion_subsanacion'],
            'observacion' => $validated['observacion'] ?? null,
            'estado' => $estadoSubsanacion,
            'fecha_subsanacion' => $estadoSubsanacion === 'SUBSANADO_DECLARADO' ? now() : null,
        ]);

        if ($evidenciaUrl !== null) {
            $subsanacion->evidencia_url = $evidenciaUrl;
        }

        $subsanacion->save();

        // Trazabilidad histórica: se registra la transición únicamente cuando
        // el estado cambia (o la condición por defecto PENDIENTE al declarar
        // por primera vez), preservando la nomenclatura cívico-preventiva.
        if ($estadoAnterior !== $estadoSubsanacion) {
            HistorialSubsanacion::create([
                'subsanacion_id' => $subsanacion->id,
                'estado_anterior' => $estadoAnterior,
                'estado_nuevo' => $estadoSubsanacion,
                'evidencia_url' => $evidenciaUrl,
                'comentario' => $validated['descripcion_subsanacion'],
            ]);
        }

        // Recálculo dinámico del ciclo de autoevaluación preventiva:
        // si todas las observaciones declaradas quedaron subsanadas por el
        // ciudadano, se actualiza el semáforo a VERDE y el GAP a 0%.
        $verificaciones = $revision->detalle_revision ?? [];
        $codigosObservados = array_keys(array_filter($verificaciones, fn ($v) => $v === false));

        $subsanacionesDeclaradas = Subsanacion::where('simulacion_revision_id', $revision->id)
            ->where('estado', 'SUBSANADO_DECLARADO')
            ->pluck('codigo_item')
            ->toArray();

        $todasSubsanadas = count($codigosObservados) > 0 &&
                           empty(array_diff($codigosObservados, $subsanacionesDeclaradas));

        if ($todasSubsanadas) {
            $autoevaluacion->update([
                'semaforo' => 'VERDE',
                'porcentaje_cumplimiento' => 100.0,
            ]);

            $revision->update([
                'resultado' => 'SIN_OBSERVACIONES',
                'porcentaje_revision' => 100.0,
                'metrica_gap' => 0.0,
            ]);
        }

        return redirect()->route('autoevaluacion.subsanacion', ['uuid' => $uuid])
            ->with('success', 'Plan de subsanación preventiva actualizado.');
    }

    public function recursosCercanos(Request $request, string $codigo): JsonResponse
    {
        $validated = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lon' => ['nullable', 'numeric', 'between:-180,180'],
            'radio' => ['nullable', 'numeric', 'between:1,50'],
        ]);

        $lat = isset($validated['lat']) ? (float) $validated['lat'] : GeoLocationService::FALLBACK_LAT;
        $lon = isset($validated['lon']) ? (float) $validated['lon'] : GeoLocationService::FALLBACK_LON;
        $radio = isset($validated['radio']) ? (float) $validated['radio'] : 5.0;

        return response()->json(
            $this->geoLocationService->buscarProveedoresPorDeficiencia($codigo, $lat, $lon, $radio)
        );
    }

    /**
     * Informe de autoevaluación preventiva integral.
     *
     * Consolida la trazabilidad completa del ciclo preventivo (subsanaciones e
     * historial de cambios de estado), las métricas de cierre y la huella
     * criptográfica SHA-256 del payload final. El documento conserva la
     * nomenclatura cívico-preventiva: nunca se titula certificado, acta ni
     * dictamen oficial.
     */
    public function informe(string $uuid): RedirectResponse|Response
    {
        $autoevaluacion = Autoevaluacion::with(['simulacionRevision.subsanaciones.historial'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $revision = $autoevaluacion->simulacionRevision;

        $verificaciones = $revision?->detalle_revision ?? [];
        $codigosObservados = array_keys(array_filter($verificaciones, fn ($v) => $v === false));

        $subsanaciones = collect($revision?->subsanaciones ?? []);

        $declaradas = $subsanaciones
            ->where('estado', 'SUBSANADO_DECLARADO')
            ->pluck('codigo_item')
            ->all();

        $deficienciasPendientes = count(array_diff($codigosObservados, $declaradas));

        if ($autoevaluacion->semaforo !== 'VERDE' || $deficienciasPendientes > 0) {
            return redirect()->route('autoevaluacion.subsanacion', ['uuid' => $uuid])
                ->withErrors(['error' => 'El informe preventivo solo está disponible cuando todas las condiciones registradas han sido declaradas como subsanadas.']);
        }

        $nombresPorCodigo = collect($this->riskService->getCatalogoChecklist())->keyBy('codigo');

        $checklist = $autoevaluacion->detalle_checklist ?? [];
        $totalCondiciones = count(array_filter(
            $checklist,
            fn ($item) => ($item['estado'] ?? 'CUMPLE') !== 'NA'
        ));

        $conformesIniciales = count(array_filter(
            $checklist,
            fn ($item) => ($item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE'
        ));

        $subsanadasDeclaradas = $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->count();

        $matriz = $subsanaciones->map(function (Subsanacion $subsanacion) use ($nombresPorCodigo): array {
            $item = $nombresPorCodigo->get($subsanacion->codigo_item);

            return [
                'codigo_item' => $subsanacion->codigo_item,
                'nombre_condicion' => $item['nombre'] ?? $subsanacion->codigo_item,
                'deficiencia_inicial' => $item['nombre'] ?? $subsanacion->codigo_item,
                'accion_realizada' => $subsanacion->descripcion,
                'estado' => $subsanacion->estado,
                'evidencia_url' => filled($subsanacion->evidencia_url)
                    ? Storage::disk('public')->url($subsanacion->evidencia_url)
                    : null,
                'fecha_subsanacion' => $subsanacion->fecha_subsanacion?->format('d/m/Y'),
            ];
        })->values();

        $resumen = [
            'total_condiciones' => $totalCondiciones,
            'conformes_iniciales' => $conformesIniciales,
            'subsanadas_declaradas' => $subsanadasDeclaradas,
            'en_proceso' => $subsanaciones->where('estado', 'EN_PROCESO')->count(),
            'pendientes' => $subsanaciones->where('estado', 'PENDIENTE')->count(),
            'gap_final' => $revision?->metrica_gap ?? 0.0,
            'porcentaje_subsanado' => $totalCondiciones > 0 ? 100 : 0,
        ];

        $codigoInforme = 'INF-PREV-'.date('Y').'-'.strtoupper(Str::random(6));

        $payloadConsolidado = [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'informe' => $codigoInforme,
            'ruc' => $autoevaluacion->ruc,
            'nombre_comercio' => $autoevaluacion->nombre_comercio,
            'sector_huancayo' => $autoevaluacion->sector_huancayo,
            'semaforo' => $autoevaluacion->semaforo,
            'porcentaje_cumplimiento' => $autoevaluacion->porcentaje_cumplimiento,
            'resumen' => $resumen,
            'evidencias' => $matriz->pluck('evidencia_url')->filter()->values()->all(),
            'matriz' => $matriz
                ->map(fn ($fila) => array_intersect_key($fila, array_flip(['codigo_item', 'estado', 'evidencia_url'])))
                ->values()
                ->all(),
        ];

        $hashFinal = hash('sha256', json_encode($payloadConsolidado));

        return Inertia::render('Evaluacion/InformePreventivo', [
            'autoevaluacion' => $autoevaluacion,
            'codigoInforme' => $codigoInforme,
            'fechaEmision' => now()->format('d/m/Y H:i'),
            'resumen' => $resumen,
            'matrizSubsanaciones' => $matriz,
            'hashFinal' => $hashFinal,
            'hashIntegridad' => $autoevaluacion->hash_integridad,
        ]);
    }

    /**
     * Asocia de forma atómica una autoevaluación iniciada como invitado a la
     * cuenta del usuario recién registrado o que inicia sesión.
     *
     * Protección contra secuestro de sesión: solo el titular del
     * guest_session_token que originó el registro (o un usuario autenticado cuyo
     * user_id ya figura en el registro) puede vincular el UUID.
     */
    public function vincularCuenta(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'string', 'exists:autoevaluaciones,uuid_trazabilidad'],
        ]);

        if (Auth::guest()) {
            abort(403, 'Debes iniciar sesión para guardar tu autoevaluación.');
        }

        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $validated['uuid'])->firstOrFail();

        if ($autoevaluacion->user_id === null) {
            $tokenSesion = $request->cookie('guest_session_token');

            $esTitularLegitimo = filled($autoevaluacion->session_token)
                && filled($tokenSesion)
                && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion);

            if (! $esTitularLegitimo) {
                abort(403, 'No autorizado para vincular esta autoevaluación.');
            }

            $asociado = DB::transaction(function () use ($autoevaluacion): int {
                return Autoevaluacion::whereKey($autoevaluacion->id)
                    ->whereNull('user_id')
                    ->update(['user_id' => Auth::id()]);
            });

            if ($asociado === 0) {
                abort(403, 'Esta autoevaluación ya fue vinculada o pertenece a otra cuenta.');
            }

            return back()->with('success', 'Tu autoevaluación ha sido guardada en tu cuenta exitosamente.');
        }

        if ((int) $autoevaluacion->user_id === (int) Auth::id()) {
            return back()->with('success', 'Tu autoevaluación ya está vinculada a tu cuenta.');
        }

        abort(403, 'Esta autoevaluación pertenece a otra cuenta.');
    }

    /**
     * Panel de retención ciudadana: lista las autoevaluaciones guardadas por el
     * usuario autenticado con su semáforo preventivo y el estado de sus subsanaciones.
     */
    public function misEvaluaciones(): Response
    {
        $autoevaluaciones = Autoevaluacion::with('simulaciones.subsanaciones')
            ->where('user_id', Auth::id())
            ->latest()
            ->get()
            ->map(function (Autoevaluacion $autoevaluacion): array {
                $subsanaciones = $autoevaluacion->simulaciones
                    ->flatMap(fn ($revision) => $revision->subsanaciones);

                return [
                    'id' => $autoevaluacion->id,
                    'uuid_trazabilidad' => $autoevaluacion->uuid_trazabilidad,
                    'nombre_comercio' => $autoevaluacion->nombre_comercio,
                    'funcion_economica' => $autoevaluacion->funcion_economica,
                    'semaforo' => $autoevaluacion->semaforo,
                    'porcentaje_cumplimiento' => $autoevaluacion->porcentaje_cumplimiento,
                    'fecha' => $autoevaluacion->created_at?->format('d/m/Y H:i'),
                    'resumen_subsanaciones' => [
                        'total' => $subsanaciones->count(),
                        'subsanadas' => $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->count(),
                        'en_proceso' => $subsanaciones->where('estado', 'EN_PROCESO')->count(),
                        'pendientes' => $subsanaciones->where('estado', 'PENDIENTE')->count(),
                    ],
                ];
            })
            ->values();

        return Inertia::render('Evaluacion/MisAutoevaluaciones', [
            'autoevaluaciones' => $autoevaluaciones,
        ]);
    }
}
