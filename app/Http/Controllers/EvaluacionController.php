<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAutoevaluacionRequest;
use App\Http\Requests\StoreChecklistDeclaracionesRequest;
use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\HistorialSubsanacion;
use App\Models\RecursoEducativo;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\ApplicabilityEngineService;
use App\Services\DirectorioAliadosService;
use App\Services\GeoLocationService;
use App\Services\ItseRiskService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvaluacionController extends Controller
{
    public const CODIGO_ACCESO_ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public const CODIGO_ACCESO_LONGITUD = 6;

    public const CODIGO_ACCESO_PREFIJO = 'CHK-';

    protected ItseRiskService $riskService;

    protected GeoLocationService $geoLocationService;

    protected ApplicabilityEngineService $applicabilityEngine;

    protected DirectorioAliadosService $directorioAliados;

    public function __construct(
        ItseRiskService $riskService,
        GeoLocationService $geoLocationService,
        ApplicabilityEngineService $applicabilityEngine,
        DirectorioAliadosService $directorioAliados
    ) {
        $this->riskService = $riskService;
        $this->geoLocationService = $geoLocationService;
        $this->applicabilityEngine = $applicabilityEngine;
        $this->directorioAliados = $directorioAliados;
    }

    public function index(): Response
    {
        return Inertia::render('Evaluacion/Home', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function nueva(Request $request): Response
    {
        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function iniciarReevaluacion(Request $request, string $uuid): Response|RedirectResponse|JsonResponse
    {
        $evaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        // Control de autorización estricto:
        // Si la autoevaluación pertenece a un usuario registrado, solo su titular puede reevaluar.
        // Si es de invitado, se exige coincidencia estricta con el guest_session_token original.
        if ($evaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $evaluacion->user_id) {
                abort(403, 'No autorizado para reevaluar esta autoevaluación.');
            }
        } else {
            $tokenSesion = $request->cookie('guest_session_token');
            if (! filled($evaluacion->session_token)
                || ! filled($tokenSesion)
                || ! hash_equals((string) $evaluacion->session_token, (string) $tokenSesion)) {
                abort(403, 'No autorizado para reevaluar esta autoevaluación.');
            }
        }

        // Control de estado: solo se puede reevaluar una autoevaluación REGISTRADA
        if (! $evaluacion->estaRegistrada()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'error' => 'evaluacion_no_registrada',
                    'mensaje' => 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.',
                ], 422);
            }

            return redirect()->route('autoevaluacion.checklist', ['uuid' => $evaluacion->uuid_trazabilidad])
                ->with('error', 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.');
        }

        // Si se solicita reevaluar sobre una evaluación que ya es una reevaluación,
        // se resuelve la referencia hacia la evaluación original raíz para evitar encadenamiento
        $origenRaiz = $evaluacion->evaluacion_origen_id ? ($evaluacion->evaluacionOrigen ?? $evaluacion) : $evaluacion;

        $reevaluacionDe = [
            'uuid' => $origenRaiz->uuid_trazabilidad,
            'nombre_comercio' => $evaluacion->nombre_comercio,
            'funcion_economica' => $evaluacion->funcion_economica,
            'ruc' => $evaluacion->ruc,
            'direccion' => $evaluacion->direccion,
            'referencia' => $evaluacion->referencia,
            'area_m2' => $evaluacion->area_m2 !== null ? (string) $evaluacion->area_m2 : null,
            'pisos' => $evaluacion->pisos !== null ? (int) $evaluacion->pisos : null,
            'aforo' => $evaluacion->aforo !== null ? (int) $evaluacion->aforo : null,
            'usa_glp' => $evaluacion->usa_glp !== null ? (bool) $evaluacion->usa_glp : null,
            'galones_glp' => $evaluacion->galones_glp !== null ? (float) $evaluacion->galones_glp : null,
            'usa_caldero' => $evaluacion->usa_caldero !== null ? (bool) $evaluacion->usa_caldero : null,
            'usa_liquidos_inflamables' => $evaluacion->usa_liquidos_inflamables !== null ? (bool) $evaluacion->usa_liquidos_inflamables : null,
            'tiene_equipos_fritura' => $evaluacion->tiene_equipos_fritura,
            'tiene_escaleras' => $evaluacion->tiene_escaleras,
            'tiene_estanterias_altas' => $evaluacion->tiene_estanterias_altas,
            'fecha_anterior' => $evaluacion->created_at?->format('d/m/Y'),
            'semaforo_anterior' => $evaluacion->semaforo,
        ];

        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
            'reevaluacionDe' => $reevaluacionDe,
        ]);
    }

    public function storeReevaluacion(StoreAutoevaluacionRequest $request, string $uuid): RedirectResponse|JsonResponse
    {
        $request->merge(['evaluacion_origen_uuid' => $uuid]);

        return $this->store($request);
    }

    public function store(StoreAutoevaluacionRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $evaluacionOrigenId = null;
        if (! empty($validated['evaluacion_origen_uuid'])) {
            $evaluacionOrigen = Autoevaluacion::where('uuid_trazabilidad', $validated['evaluacion_origen_uuid'])->firstOrFail();

            if ($evaluacionOrigen->user_id !== null) {
                $user = $request->user();
                if ($user === null || (int) $user->id !== (int) $evaluacionOrigen->user_id) {
                    abort(403, 'No autorizado para reevaluar esta autoevaluación.');
                }
            } else {
                $tokenSesion = $request->cookie('guest_session_token');
                if (! filled($evaluacionOrigen->session_token)
                    || ! filled($tokenSesion)
                    || ! hash_equals((string) $evaluacionOrigen->session_token, (string) $tokenSesion)) {
                    abort(403, 'No autorizado para reevaluar esta autoevaluación.');
                }
            }

            // Bloqueo backend: la evaluación origen debe estar en estado REGISTRADA
            if (! $evaluacionOrigen->estaRegistrada()) {
                if ($request->expectsJson() || $request->wantsJson()) {
                    return response()->json([
                        'error' => 'evaluacion_no_registrada',
                        'mensaje' => 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.',
                    ], 422);
                }

                return redirect()->route('autoevaluacion.checklist', ['uuid' => $evaluacionOrigen->uuid_trazabilidad])
                    ->with('error', 'Solo es posible iniciar una reevaluación a partir de una autoevaluación registrada.');
            }

            // Si la evaluación referenciada ya es una reevaluación, se enlaza directamente a la evaluación original raíz
            // para evitar el encadenamiento A -> B -> C -> D y mantener el modelo estrella: A -> [B, C, D].
            $evaluacionOrigenId = $evaluacionOrigen->evaluacion_origen_id ?? $evaluacionOrigen->id;
        }

        // Normalización: los estados declarados son la fuente de verdad; la
        // marca booleana `cumple` se deriva para evitar inconsistencias entre
        // ambos campos cuando el cliente los envía contradictorios.
        $checklist = collect($request->input('checklist', []))->map(function (array $item): array {
            $estado = (string) ($item['estado'] ?? '');

            return array_merge($item, ['cumple' => $estado === 'CUMPLE']);
        })->values()->all();

        $usaGlp = array_key_exists('usa_glp', $validated) && $validated['usa_glp'] !== null ? (bool) $validated['usa_glp'] : null;
        $galonesGlp = array_key_exists('galones_glp', $validated) && $validated['galones_glp'] !== null ? (float) $validated['galones_glp'] : null;
        $usaCaldero = array_key_exists('usa_caldero', $validated) && $validated['usa_caldero'] !== null ? (bool) $validated['usa_caldero'] : null;
        $usaLiquidosInflamables = array_key_exists('usa_liquidos_inflamables', $validated) && $validated['usa_liquidos_inflamables'] !== null ? (bool) $validated['usa_liquidos_inflamables'] : null;
        $tieneEquiposFritura = array_key_exists('tiene_equipos_fritura', $validated) && $validated['tiene_equipos_fritura'] !== null ? (bool) $validated['tiene_equipos_fritura'] : null;
        $tieneEscaleras = array_key_exists('tiene_escaleras', $validated) && $validated['tiene_escaleras'] !== null ? (bool) $validated['tiene_escaleras'] : null;
        $tieneEstanteriasAltas = array_key_exists('tiene_estanterias_altas', $validated) && $validated['tiene_estanterias_altas'] !== null ? (bool) $validated['tiene_estanterias_altas'] : null;

        $porcentajeCumplimiento = 0.0;
        $semaforo = 'PENDIENTE';

        // En el nuevo flujo dinámico (Bloque 3), no se calcula conformidad ni semáforo en la creación.
        // Soporte transicional legacy: solo si la petición incluye explícitamente una checklist antigua con ítems,
        // se calcula conformidad para preservar módulos y tests históricos aislados.
        if (! empty($checklist)) {
            $conformidad = $this->riskService->calcularConformidad($checklist);
            $porcentajeCumplimiento = $conformidad['porcentaje'];
            $semaforo = $conformidad['semaforo'];
        }

        $uuid = (string) Str::uuid();
        $hashIntegridad = ! empty($checklist) ? hash('sha256', $uuid.($validated['ruc'] ?? '').Carbon::now()->timestamp) : null;

        // Estructura de características declaradas (solo las que el ciudadano realmente declaró)
        $caracteristicasDeclaradas = array_filter([
            'area_m2' => $validated['area_m2'] ?? null,
            'pisos' => $validated['pisos'] ?? null,
            'aforo' => $validated['aforo'] ?? null,
            'usa_glp' => $usaGlp,
            'galones_glp' => $galonesGlp,
            'usa_caldero' => $usaCaldero,
            'usa_liquidos_inflamables' => $usaLiquidosInflamables,
            'tiene_equipos_fritura' => $tieneEquiposFritura,
            'tiene_escaleras' => $tieneEscaleras,
            'tiene_estanterias_altas' => $tieneEstanteriasAltas,
        ], fn ($val) => $val !== null);

        $maxIntentos = 3;
        $intento = 0;
        $autoevaluacion = null;

        while ($intento < $maxIntentos) {
            $intento++;
            $codigoAcceso = $this->generarCodigoAccesoUnico();

            try {
                $autoevaluacion = Autoevaluacion::create([
                    'user_id' => Auth::id(),
                    'session_token' => $request->cookie('guest_session_token'),
                    'evaluacion_origen_id' => $evaluacionOrigenId,
                    'uuid_trazabilidad' => $uuid,
                    'codigo_acceso' => $codigoAcceso,
                    'estado' => Autoevaluacion::ESTADO_INICIADA,
                    'registrada_at' => null,
                    'hash_integridad' => $hashIntegridad,
                    'nombre_comercio' => $validated['nombre_comercio'],
                    'funcion_economica' => $validated['funcion_economica'],
                    'ruc' => $validated['ruc'] ?? null,
                    'direccion' => $validated['direccion'] ?? null,
                    'referencia' => $validated['referencia'] ?? null,
                    'area_m2' => $validated['area_m2'] ?? null,
                    'pisos' => $validated['pisos'] ?? null,
                    'aforo' => $validated['aforo'] ?? null,
                    'caracteristicas_declaradas' => $caracteristicasDeclaradas,
                    'usa_glp' => $usaGlp,
                    'galones_glp' => $galonesGlp,
                    'usa_caldero' => $usaCaldero,
                    'usa_liquidos_inflamables' => $usaLiquidosInflamables,
                    'tiene_equipos_fritura' => $tieneEquiposFritura,
                    'tiene_escaleras' => $tieneEscaleras,
                    'tiene_estanterias_altas' => $tieneEstanteriasAltas,
                    'tipo_tramite' => null,
                    'nivel_riesgo' => null,
                    'porcentaje_cumplimiento' => $porcentajeCumplimiento,
                    'semaforo' => $semaforo,
                    'detalle_checklist' => $checklist,
                    'plan_accion_costos' => null,
                ]);
                break;
            } catch (QueryException $e) {
                if ($this->esColisionCodigoAcceso($e) && $intento < $maxIntentos) {
                    continue;
                }
                throw $e;
            }
        }

        $request->session()->put('guest_authorized_uuid', $autoevaluacion->uuid_trazabilidad);
        if ($autoevaluacion->session_token) {
            $request->session()->put('guest_session_token', $autoevaluacion->session_token);
        }

        return redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]);
    }

    public function resultado(Request $request, string $uuid)
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'reevaluaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        // Control de acceso para FASE 15:
        // Si pertenece a usuario registrado, solo su titular puede consultarla.
        // Si pertenece a invitado, solo el guest_session_token coincidente o la sesión que la originó.
        if ($autoevaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $autoevaluacion->user_id) {
                abort(403, 'No autorizado para consultar esta autoevaluación.');
            }
        } else {
            if ($request->user() !== null) {
                abort(403, 'No autorizado para consultar esta autoevaluación.');
            }

            if (filled($autoevaluacion->session_token)) {
                $tokenCookie = $request->cookie('guest_session_token');
                $tokenSesion = $request->session()->get('guest_session_token');

                $esValidoPorCookie = filled($tokenCookie) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenCookie);
                $esValidoPorSesion = filled($tokenSesion) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion);
                $esSesionInmediata = $request->session()->get('guest_authorized_uuid') === $autoevaluacion->uuid_trazabilidad;

                if (! $esValidoPorCookie && ! $esValidoPorSesion && ! $esSesionInmediata) {
                    abort(403, 'No autorizado para consultar esta autoevaluación.');
                }
            }
        }

        // Desacoplamiento UX-06.2: Si la autoevaluación pertenece al flujo V2 normativo,
        // se redirige dinámicamente con HTTP 302 hacia la pantalla oficial de resumen descriptivo,
        // evitando la exposición indebida de semáforos, porcentajes, costos y simulación in situ.
        if ($autoevaluacion->esFlujoNuevo()) {
            return redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad], 302);
        }

        return Inertia::render('Evaluacion/Resultado', [
            'autoevaluacion' => $autoevaluacion,
            'catalogo' => $this->riskService->getCatalogoChecklist(),
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
            'evidencia' => ['nullable', 'file', 'mimes:jpeg,png,webp,pdf', 'max:5120'],
        ], [
            'evidencia.file' => 'El archivo de evidencia no es válido.',
            'evidencia.mimes' => 'Este formato de archivo no está permitido. Solo se admiten imágenes JPG, PNG, WEBP o documentos PDF.',
            'evidencia.max' => 'El archivo supera el tamaño máximo permitido (5 MB).',
            'evidencia.uploaded' => 'El archivo de evidencia no pudo subirse correctamente.',
        ]);

        $estadoSubsanacion = $validated['estado'] ?? 'PENDIENTE';

        $subsanacion = Subsanacion::firstOrNew([
            'simulacion_revision_id' => $revision->id,
            'codigo_item' => $validated['codigo_item'],
        ]);

        $estadoAnterior = $subsanacion->exists ? $subsanacion->estado : 'PENDIENTE';

        // Ruta previa de la evidencia para retirar del almacenamiento privado el
        // archivo obsoleto cuando el ciudadano la reemplaza por una nueva.
        $rutaEvidenciaAnterior = $subsanacion->exists ? $subsanacion->evidencia_url : null;

        $evidenciaUrl = null;
        if ($request->hasFile('evidencia')) {
            // Las evidencias se conservan en almacenamiento privado: solo el
            // titular (o el titular del guest_session_token que las originó)
            // puede consultarlas a través de la ruta autorizada de descarga.
            $evidenciaUrl = Storage::disk('local')->putFile('evidencias/subsanaciones', $request->file('evidencia'));

            if (filled($rutaEvidenciaAnterior) && $rutaEvidenciaAnterior !== $evidenciaUrl) {
                Storage::disk('local')->delete($rutaEvidenciaAnterior);
            }
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

    /**
     * Descarga o visualiza una evidencia declarada por el ciudadano.
     *
     * Restringido por propiedad: si la autoevaluación pertenece a una cuenta
     * registrada solo su titular puede acceder; si aún es de invitado, debe
     * presentar el guest_session_token que originó el registro. El archivo vive
     * en almacenamiento privado y nunca se sirve por URL pública directa.
     */
    public function descargarEvidencia(Request $request, string $uuid, Subsanacion $subsanacion): StreamedResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        $revision = $autoevaluacion->simulacionRevision;
        if ($revision === null || (int) $subsanacion->simulacion_revision_id !== (int) $revision->id) {
            abort(404);
        }

        $autenticado = $request->user();

        if ($autoevaluacion->user_id !== null) {
            if ($autenticado === null || (int) $autenticado->id !== (int) $autoevaluacion->user_id) {
                abort(403, 'No autorizado para consultar esta evidencia.');
            }
        } else {
            $tokenSesion = $request->cookie('guest_session_token');

            if (! filled($autoevaluacion->session_token)
                || ! filled($tokenSesion)
                || ! hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion)) {
                abort(403, 'No autorizado para consultar esta evidencia.');
            }
        }

        $path = $subsanacion->evidencia_url;

        if (! filled($path)) {
            abort(404);
        }

        $disco = Storage::disk('local');

        if (! $disco->exists($path)) {
            abort(404);
        }

        return $disco->response($path);
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
    public function informe(Request $request, string $uuid): Response
    {
        $autoevaluacion = Autoevaluacion::with([
            'simulacionRevision.subsanaciones.historial',
            'evaluacionOrigen',
        ])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        // Control de autorización estricto (FASE 16):
        // Usuario registrado: solo puede acceder el titular del user_id.
        // Invitado: solo puede acceder quien posea el guest_session_token legítimo o la sesión inmediata.
        if ($autoevaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $autoevaluacion->user_id) {
                abort(403, 'No autorizado para consultar este informe preventivo.');
            }
        } else {
            if ($request->user() !== null) {
                abort(403, 'No autorizado para consultar este informe preventivo.');
            }

            if (filled($autoevaluacion->session_token)) {
                $tokenCookie = $request->cookie('guest_session_token');
                $tokenSesion = $request->session()->get('guest_session_token');

                $esValidoPorCookie = filled($tokenCookie) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenCookie);
                $esValidoPorSesion = filled($tokenSesion) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion);
                $esSesionInmediata = $request->session()->get('guest_authorized_uuid') === $autoevaluacion->uuid_trazabilidad;

                if (! $esValidoPorCookie && ! $esValidoPorSesion && ! $esSesionInmediata) {
                    abort(403, 'No autorizado para consultar este informe preventivo.');
                }
            }
        }

        $revision = $autoevaluacion->simulacionRevision;

        $verificaciones = $revision?->detalle_revision ?? [];
        $codigosObservados = array_keys(array_filter($verificaciones, fn ($v) => $v === false));

        $subsanaciones = collect($revision?->subsanaciones ?? []);

        $declaradas = $subsanaciones
            ->where('estado', 'SUBSANADO_DECLARADO')
            ->pluck('codigo_item')
            ->all();

        $nombresPorCodigo = collect($this->riskService->getCatalogoChecklist())->keyBy('codigo');

        $categoriaPorCodigo = [
            'EXTINTOR_PQS' => 'INCENDIOS',
            'EXTINTOR_K' => 'INCENDIOS',
            'DETECTORES_HUMO' => 'INCENDIOS',
            'CAMPANA_EXTRACCION' => 'INCENDIOS',
            'DIFERENCIAL' => 'ELECTRICIDAD',
            'TERMOMAGNETICO' => 'ELECTRICIDAD',
            'TABLERO_MANDIL' => 'ELECTRICIDAD',
            'POZO_TIERRA' => 'ELECTRICIDAD',
            'CABLEADO_CANALIZADO' => 'ELECTRICIDAD',
            'EVACUACION' => 'EVACUACION',
            'PUERTAS_ESCAPE' => 'EVACUACION',
            'LUCES_EMERG' => 'EVACUACION',
            'SENALETICA' => 'EVACUACION',
            'AFORO_CARTEL' => 'EVACUACION',
            'BOTIQUIN' => 'ESTRUCTURAL_AUXILIOS',
            'ANCLAJE_ESTANTERIAS' => 'ESTRUCTURAL_AUXILIOS',
            'LAMINADO_VIDRIOS' => 'ESTRUCTURAL_AUXILIOS',
        ];

        $checklistRaw = $autoevaluacion->detalle_checklist ?? [];

        // Matriz completa enriquecida de condiciones evaluadas (todas las registradas)
        $detalleChecklist = collect($checklistRaw)->map(function ($item) use ($nombresPorCodigo, $categoriaPorCodigo) {
            $codigo = $item['codigo'] ?? '';
            $catalogoItem = $nombresPorCodigo->get($codigo);
            $estado = (string) ($item['estado'] ?? ($item['cumple'] ?? true ? 'CUMPLE' : 'NO_CUMPLE'));

            return [
                'codigo' => $codigo,
                'nombre' => $item['nombre'] ?? ($catalogoItem['nombre'] ?? $codigo),
                'categoria' => $item['categoria'] ?? ($categoriaPorCodigo[$codigo] ?? 'GENERAL'),
                'estado' => $estado,
                'cumple' => $estado === 'CUMPLE',
                'es_critico' => (bool) ($item['es_critico'] ?? ($catalogoItem['es_critico'] ?? false)),
                'norma' => $item['norma'] ?? ($catalogoItem['norma'] ?? 'Normativa ITSE / CENEPRED'),
            ];
        })->values()->all();

        // Resumen cuantitativo por estado de las condiciones
        $totalCondicionesEvaluables = count(array_filter(
            $checklistRaw,
            fn ($item) => ($item['estado'] ?? 'CUMPLE') !== 'NA'
        ));

        $conformesIniciales = count(array_filter(
            $checklistRaw,
            fn ($item) => ($item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE'
        ));

        $conteoEstados = [
            'total' => count($checklistRaw),
            'cumple' => count(array_filter($checklistRaw, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE')),
            'no_cumple' => count(array_filter($checklistRaw, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'NO_CUMPLE')),
            'por_revisar' => count(array_filter($checklistRaw, fn ($i) => ($i['estado'] ?? '') === 'POR_REVISAR')),
            'na' => count(array_filter($checklistRaw, fn ($i) => ($i['estado'] ?? '') === 'NA')),
        ];

        $subsanadasDeclaradas = $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->count();
        $totalObservadas = count($codigosObservados);
        $porcentajeSubsanado = $totalObservadas > 0
            ? (int) round(($subsanadasDeclaradas / $totalObservadas) * 100)
            : ($totalCondicionesEvaluables > 0 ? 100 : 0);

        $matriz = $subsanaciones->map(function (Subsanacion $subsanacion) use ($nombresPorCodigo, $uuid): array {
            $item = $nombresPorCodigo->get($subsanacion->codigo_item);

            $evidenciaUrl = filled($subsanacion->evidencia_url)
                ? route('autoevaluacion.evidencia', ['uuid' => $uuid, 'subsanacion' => $subsanacion])
                : null;

            return [
                'codigo_item' => $subsanacion->codigo_item,
                'nombre_condicion' => $item['nombre'] ?? $subsanacion->codigo_item,
                'deficiencia_inicial' => $item['nombre'] ?? $subsanacion->codigo_item,
                'accion_realizada' => $subsanacion->descripcion,
                'estado' => $subsanacion->estado,
                'evidencia_url' => $evidenciaUrl,
                'evidencia_archivo' => $subsanacion->evidencia_url,
                'fecha_subsanacion' => $subsanacion->fecha_subsanacion?->format('d/m/Y'),
            ];
        })->values();

        $resumen = [
            'total_condiciones' => $totalCondicionesEvaluables,
            'conformes_iniciales' => $conformesIniciales,
            'subsanadas_declaradas' => $subsanadasDeclaradas,
            'en_proceso' => $subsanaciones->where('estado', 'EN_PROCESO')->count(),
            'pendientes' => $subsanaciones->where('estado', 'PENDIENTE')->count(),
            'gap_final' => $revision?->metrica_gap ?? 0.0,
            'porcentaje_subsanado' => $porcentajeSubsanado,
        ];

        $codigoInforme = 'INF-PREV-'.date('Y').'-'.strtoupper(Str::random(6));

        // El hash de integridad del informe debe ser reproducible: el mismo estado
        // de la autoevaluación tiene que producir siempre la misma huella, aunque
        // el informe se recargue o se imprima en otro momento. Por eso el código
        // de emisión, aleatorio por emisión, queda fuera del payload hasheado y
        // solo se publica como dato de presentación.
        $payloadConsolidado = [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
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

        $esReevaluacion = $autoevaluacion->evaluacion_origen_id !== null;
        $evaluacionOrigen = $autoevaluacion->evaluacionOrigen ? [
            'uuid_trazabilidad' => $autoevaluacion->evaluacionOrigen->uuid_trazabilidad,
            'fecha' => $autoevaluacion->evaluacionOrigen->created_at?->format('d/m/Y H:i') ?? $autoevaluacion->evaluacionOrigen->created_at?->format('d/m/Y'),
            'semaforo' => $autoevaluacion->evaluacionOrigen->semaforo,
            'porcentaje_cumplimiento' => $autoevaluacion->evaluacionOrigen->porcentaje_cumplimiento,
        ] : null;

        return Inertia::render('Evaluacion/InformePreventivo', [
            'autoevaluacion' => $autoevaluacion->paraInforme(),
            'esReevaluacion' => $esReevaluacion,
            'evaluacionOrigen' => $evaluacionOrigen,
            'codigoInforme' => $codigoInforme,
            'fechaEmision' => now()->format('d/m/Y H:i'),
            'resumen' => $resumen,
            'detalleChecklist' => $detalleChecklist,
            'conteoEstados' => $conteoEstados,
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
            'destino' => ['nullable', 'string', 'in:checklist,resumen'],
        ]);

        if (Auth::guest()) {
            abort(403, 'Debes iniciar sesión para guardar tu autoevaluación.');
        }

        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $validated['uuid'])->firstOrFail();

        $resolverRedireccion = function (string $mensaje) use ($autoevaluacion, $validated): RedirectResponse {
            $destino = $validated['destino'] ?? null;

            $redirect = match ($destino) {
                'checklist' => redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
                'resumen' => redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad]),
                default => $autoevaluacion->estaRegistrada()
                    ? redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                    : back(),
            };

            return $redirect->with('success', $mensaje);
        };

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

            return $resolverRedireccion('Tu autoevaluación ha sido guardada en tu cuenta exitosamente.');
        }

        if ((int) $autoevaluacion->user_id === (int) Auth::id()) {
            return $resolverRedireccion('Tu autoevaluación ya está vinculada a tu cuenta.');
        }

        abort(403, 'Esta autoevaluación pertenece a otra cuenta.');
    }

    /**
     * Panel de retención ciudadana e historial preventivo: lista las autoevaluaciones
     * guardadas por el usuario autenticado con su estado del ciclo de vida, conteos
     * descriptivos normativos, trazabilidad criptográfica y soporte transicional legacy.
     */
    public function misEvaluaciones(): Response
    {
        $autoevaluaciones = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->where('user_id', Auth::id())
            ->latest('id')
            ->get()
            ->map(function (Autoevaluacion $autoevaluacion): array {
                $subsanaciones = $autoevaluacion->simulaciones
                    ->flatMap(fn ($revision) => $revision->subsanaciones);

                $checklist = $autoevaluacion->detalle_checklist ?? [];
                $esFlujoNuevo = $autoevaluacion->esFlujoNuevo();

                $conteoCondiciones = [
                    'total' => count($checklist),
                    'cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE')),
                    'no_cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'NO_CUMPLE')),
                    'por_revisar' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'POR_REVISAR')),
                    'na' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'NA')),
                ];

                $conteosNormativos = null;
                $desgloseEspecialidades = null;

                if ($esFlujoNuevo) {
                    // El resumen se genera una sola vez: alimenta tanto los conteos
                    // como el desglose por especialidad. Para una autoevaluación ya
                    // registrada los conteos siguen leyéndose de los contadores
                    // sellados; el desglose se reconstruye porque solo existen
                    // totales agregados, no el detalle por criterio.
                    $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);

                    if ($autoevaluacion->estaRegistrada() && $autoevaluacion->total_condiciones_evaluadas !== null) {
                        $conteosNormativos = [
                            'total_criterios_aplicables' => (int) $autoevaluacion->total_condiciones_evaluadas,
                            'cumple_declarado' => (int) $autoevaluacion->total_cumple_declarado,
                            'pendiente_atender' => (int) $autoevaluacion->total_pendiente_atender,
                            'por_revisar' => (int) $autoevaluacion->total_por_revisar,
                            'no_aplica' => (int) $autoevaluacion->total_no_aplica,
                        ];
                    } else {
                        $conteos = $resumenData['conteos'];
                        $conteosNormativos = [
                            'total_criterios_aplicables' => (int) $conteos['total_criterios_aplicables'],
                            'cumple_declarado' => (int) $conteos['total_cumple_declarado'],
                            'pendiente_atender' => (int) $conteos['total_pendiente_atender'],
                            'por_revisar' => (int) $conteos['total_por_revisar'],
                            'no_aplica' => (int) $conteos['total_no_aplica'],
                        ];
                    }

                    $desgloseEspecialidades = $this->adjuntarDesgloseEspecialidadesAResumen($resumenData)['desglose_especialidades'];
                }

                return [
                    'id' => $autoevaluacion->id,
                    'uuid_trazabilidad' => $autoevaluacion->uuid_trazabilidad,
                    'codigo_acceso' => $autoevaluacion->codigo_acceso,
                    'evaluacion_origen_id' => $autoevaluacion->evaluacion_origen_id,
                    'evaluacion_origen_uuid' => $autoevaluacion->evaluacionOrigen?->uuid_trazabilidad,
                    'nombre_comercio' => $autoevaluacion->nombre_comercio,
                    'funcion_economica' => $autoevaluacion->funcion_economica,
                    'ruc' => $autoevaluacion->ruc,
                    'direccion' => $autoevaluacion->direccion,
                    'area_m2' => $autoevaluacion->area_m2,
                    'pisos' => $autoevaluacion->pisos,
                    'aforo' => $autoevaluacion->aforo,
                    'estado' => $autoevaluacion->estado ?? Autoevaluacion::ESTADO_INICIADA,
                    'registrada_at' => $autoevaluacion->registrada_at?->format('d/m/Y H:i'),
                    'es_flujo_nuevo' => $esFlujoNuevo,
                    'conteos_normativos' => $conteosNormativos,
                    'desglose_especialidades' => $desgloseEspecialidades,
                    'semaforo' => $autoevaluacion->semaforo,
                    'porcentaje_cumplimiento' => $autoevaluacion->porcentaje_cumplimiento,
                    'fecha' => $autoevaluacion->created_at?->format('d/m/Y H:i'),
                    'fecha_corta' => $autoevaluacion->created_at?->format('d/m/Y'),
                    'created_at' => $autoevaluacion->created_at?->toIso8601String(),
                    'hash_integridad' => $autoevaluacion->hash_integridad,
                    'conteo_condiciones' => $conteoCondiciones,
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

    /**
     * Retorna el checklist dinámico de autoevaluación generado por el motor de aplicabilidad.
     */
    public function checklistDinamico(Request $request, string $uuid): Response|JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $checklist = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $checklist = $this->adjuntarRecursosEducativosAChecklist($checklist);

        if (! $request->wantsJson() && ! $request->is('api/*')) {
            return Inertia::render('Evaluacion/Checklist', [
                'autoevaluacion' => [
                    'id' => $autoevaluacion->id,
                    'uuid' => $autoevaluacion->uuid_trazabilidad,
                    'nombre_comercio' => $autoevaluacion->nombre_comercio,
                    'direccion' => $autoevaluacion->direccion,
                    'estado' => $autoevaluacion->estado,
                    'registrada_at' => $autoevaluacion->registrada_at?->format('d/m/Y H:i'),
                    'hash_integridad' => $autoevaluacion->hash_integridad,
                ],
                'checklist' => $checklist,
            ]);
        }

        return response()->json($checklist);
    }

    /**
     * Registra las declaraciones ciudadanas sobre los criterios evaluables del checklist dinámico.
     * Rechaza de forma estricta el estado NO_APLICA como respuesta ciudadana y bloquea modificaciones
     * si la autoevaluación ya se encuentra REGISTRADA.
     */
    public function guardarDeclaracionesChecklist(StoreChecklistDeclaracionesRequest $request, string $uuid): JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        if ($autoevaluacion->estaRegistrada()) {
            return response()->json([
                'error' => 'autoevaluacion_registrada',
                'mensaje' => 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones. No se pueden modificar las declaraciones.',
            ], 409);
        }

        $respuestasInput = $request->validated('respuestas');
        $respuestasGuardadas = [];

        try {
            DB::transaction(function () use ($autoevaluacion, $respuestasInput, &$respuestasGuardadas) {
                foreach ($respuestasInput as $item) {
                    $codigo = $item['codigo'];
                    $estado = $item['estado'];
                    $notas = $item['notas'] ?? null;

                    $respuesta = $this->applicabilityEngine->registrarRespuestaCiudadana(
                        $autoevaluacion,
                        $codigo,
                        $estado,
                        $notas
                    );

                    $respuestasGuardadas[] = [
                        'id' => $respuesta->id,
                        'codigo' => $codigo,
                        'estado' => $respuesta->estado_respuesta,
                        'notas' => $respuesta->notas_ciudadano,
                    ];
                }
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'declaracion_invalida',
                'mensaje' => $e->getMessage(),
            ], 422);
        }

        $checklistActualizado = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $checklistActualizado = $this->adjuntarRecursosEducativosAChecklist($checklistActualizado);

        return response()->json([
            'mensaje' => 'Declaraciones registradas exitosamente.',
            'guardadas' => $respuestasGuardadas,
            'checklist' => $checklistActualizado,
        ], 200);
    }

    /**
     * Cierre formal e integridad de la autoevaluación (Bloque 3 — Paso 8).
     * Sella las declaraciones ciudadanas, calcula el hash determinístico SHA-256
     * y transiciona el estado de INICIADA a REGISTRADA.
     */
    public function finalizar(Request $request, string $uuid): JsonResponse|RedirectResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        // 1. Idempotencia: si ya está registrada, no recalcular ni alterar
        if ($autoevaluacion->estaRegistrada()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'mensaje' => 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones.',
                    'estado' => $autoevaluacion->estado,
                    'registrada_at' => $autoevaluacion->registrada_at?->toIso8601String(),
                    'hash_integridad' => $autoevaluacion->hash_integridad,
                    'uuid' => $autoevaluacion->uuid_trazabilidad,
                ], 200);
            }

            return redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                ->with('info', 'La autoevaluación ya se encuentra registrada y protegida contra modificaciones.');
        }

        // 2. Reconstruir checklist y validar que todos los criterios aplicables tengan declaración
        $checklist = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $criteriosAplicables = $checklist['criterios'];
        $informacionPendiente = $checklist['informacion_pendiente'];

        $pendientes = [];
        foreach ($criteriosAplicables as $criterio) {
            if (! isset($criterio['estado']) || ! in_array($criterio['estado'], ApplicabilityEngineService::RESPUESTAS_CIUDADANAS_PERMITIDAS, true)) {
                $pendientes[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                ];
            }
        }

        if (count($informacionPendiente) > 0) {
            foreach ($informacionPendiente as $criterio) {
                $pendientes[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'motivo' => $criterio['mensaje'] ?? 'Información física pendiente',
                ];
            }
        }

        if (count($pendientes) > 0) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'criterios_pendientes',
                    'mensaje' => 'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.',
                    'pendientes' => $pendientes,
                ], 422);
            }

            return redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                ->with('error', 'Existen condiciones pendientes de declaración antes de registrar su autoevaluación.');
        }

        // 3. Generar snapshot canónico normalizado y hash determinístico SHA-256
        $payloadCanonico = $this->applicabilityEngine->generarPayloadCanonico($autoevaluacion);
        $this->applicabilityEngine->normalizarArrayDeterminista($payloadCanonico);
        $jsonCanonico = (string) json_encode($payloadCanonico, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hashIntegridad = hash('sha256', $jsonCanonico);

        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $conteos = $resumenData['conteos'];

        // 4. Transacción atómica para sellar la autoevaluación con su snapshot inmutable
        DB::transaction(function () use ($autoevaluacion, $payloadCanonico, $hashIntegridad, $conteos) {
            $autoevaluacion->update([
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => now(),
                'hash_integridad' => $hashIntegridad,
                'payload_canonico' => $payloadCanonico,
                'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
                'total_cumple_declarado' => $conteos['total_cumple_declarado'],
                'total_pendiente_atender' => $conteos['total_pendiente_atender'],
                'total_por_revisar' => $conteos['total_por_revisar'],
                'total_no_aplica' => $conteos['total_no_aplica'],
            ]);
        });

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json([
                'mensaje' => 'Autoevaluación registrada correctamente y protegida contra modificaciones.',
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => $autoevaluacion->fresh()->registrada_at?->toIso8601String(),
                'hash_integridad' => $hashIntegridad,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
            ], 200);
        }

        return redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
            ->with('success', 'Autoevaluación registrada correctamente y protegida contra modificaciones.');
    }

    /**
     * Muestra el resumen descriptivo y orientativo de la autoevaluación (Bloque 3 — Paso 5).
     * Proporciona los conteos absolutos y la clasificación de criterios declarados,
     * sin calcular porcentajes, semáforos ni puntuaciones oficiales.
     */
    public function resumen(Request $request, string $uuid): Response|JsonResponse
    {
        $autoevaluacion = $this->resolverAutoevaluacion($uuid);
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $resumenData = $this->adjuntarRecursosEducativosAResumen($resumenData);
        $resumenData = $this->adjuntarAsistenciaTecnicaAResumen($resumenData);
        $resumenData = $this->adjuntarDesgloseEspecialidadesAResumen($resumenData);

        $datosAutoevaluacion = [
            'id' => $autoevaluacion->id,
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'nombre_comercio' => $autoevaluacion->nombre_comercio,
            'funcion_economica' => $autoevaluacion->funcion_economica,
            'ruc' => $autoevaluacion->ruc,
            'direccion' => $autoevaluacion->direccion,
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'caracteristicas_declaradas' => $autoevaluacion->caracteristicas_declaradas,
            'estado' => $autoevaluacion->estado,
            'registrada_at' => $autoevaluacion->registrada_at?->format('d/m/Y H:i'),
            'hash_integridad' => $autoevaluacion->hash_integridad,
        ];

        $payload = [
            'autoevaluacion' => $datosAutoevaluacion,
            'resumen' => $resumenData['conteos'],
            'pendiente_atender' => $resumenData['pendiente_atender'],
            'por_revisar' => $resumenData['por_revisar'],
            'cumple_declarado' => $resumenData['cumple_declarado'],
            'no_aplica' => $resumenData['no_aplica'],
            'desglose_especialidades' => $resumenData['desglose_especialidades'],
        ];

        if (! $request->wantsJson() && ! $request->is('api/*')) {
            return Inertia::render('Evaluacion/Resumen', $payload);
        }

        return response()->json($payload);
    }

    /**
     * Resuelve una autoevaluación por su UUID de trazabilidad o ID numérico.
     */
    protected function resolverAutoevaluacion(string $uuid): Autoevaluacion
    {
        return Autoevaluacion::where('uuid_trazabilidad', $uuid)
            ->when(is_numeric($uuid), fn ($query) => $query->orWhere('id', (int) $uuid))
            ->firstOrFail();
    }

    /**
     * Control de autorización estricto y consistente para acceso a la autoevaluación.
     */
    protected function autorizarAccesoAutoevaluacion(Request $request, Autoevaluacion $autoevaluacion): void
    {
        if ($autoevaluacion->user_id !== null) {
            $user = $request->user();
            if ($user === null || (int) $user->id !== (int) $autoevaluacion->user_id) {
                abort(403, 'No autorizado para acceder a esta autoevaluación.');
            }

            return;
        }

        // Evaluación de invitado (user_id === null): exige credencial legítima de invitado
        if (filled($autoevaluacion->session_token)) {
            $tokenCookie = $request->cookie('guest_session_token');
            $tokenSesion = $request->hasSession() ? $request->session()->get('guest_session_token') : null;
            $esSesionInmediata = $request->hasSession() && $request->session()->get('guest_authorized_uuid') === $autoevaluacion->uuid_trazabilidad;

            $esValido = (filled($tokenCookie) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenCookie))
                || (filled($tokenSesion) && hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion))
                || $esSesionInmediata;

            if (! $esValido) {
                abort(403, 'No autorizado para acceder a esta autoevaluación.');
            }
        }
    }

    /**
     * Mapea un modelo RecursoEducativo al contrato esperado por los componentes React.
     *
     * @return array<string, mixed>
     */
    private function formatearRecursoEducativo(RecursoEducativo $recurso): array
    {
        return [
            'id' => $recurso->id,
            'criterio_normativo_id' => $recurso->criterio_normativo_id,
            'titulo' => $recurso->titulo,
            'descripcion_corta' => $recurso->descripcion_corta,
            'tipo' => $recurso->tipo,
            'url' => $recurso->url,
            'fuente_autor' => $recurso->fuente_autor,
            'duracion_estimada' => $recurso->duracion_estimada,
        ];
    }

    /**
     * Obtiene los recursos educativos activos agrupados por ID de criterio normativo.
     *
     * @param  Collection<int, int>  $criterioIds
     * @return Collection<int, Collection<int, RecursoEducativo>>
     */
    private function obtenerRecursosPorCriterioIds($criterioIds)
    {
        if ($criterioIds->isEmpty()) {
            return collect();
        }

        return RecursoEducativo::activos()
            ->whereIn('criterio_normativo_id', $criterioIds)
            ->orderBy('id')
            ->get()
            ->groupBy('criterio_normativo_id');
    }

    /**
     * Adjunta los recursos educativos activos al checklist dinámico para la interfaz ciudadana.
     *
     * @param  array<string, mixed>  $checklist
     * @return array<string, mixed>
     */
    private function adjuntarRecursosEducativosAChecklist(array $checklist): array
    {
        if (empty($checklist['criterios'])) {
            return $checklist;
        }

        $criterioIds = collect($checklist['criterios'])
            ->pluck('criterio_id')
            ->filter()
            ->unique()
            ->values();

        $recursosPorCriterio = $this->obtenerRecursosPorCriterioIds($criterioIds);

        foreach ($checklist['criterios'] as &$criterio) {
            $criterioId = $criterio['criterio_id'] ?? null;
            $recursos = $recursosPorCriterio->get($criterioId, collect());

            $criterio['recursos_educativos'] = $recursos->map(
                fn (RecursoEducativo $r) => $this->formatearRecursoEducativo($r)
            )->values()->all();
        }
        unset($criterio);

        return $checklist;
    }

    /**
     * Agrega el desglose de condiciones por disciplina técnica ITSE al resumen.
     *
     * Es puramente aditivo: no toca ninguna clave existente. El estado de cada
     * condición se deduce de la colección de la que proviene, porque
     * `generarResumenDescriptivo()` no expone `estado` dentro de cada ítem.
     * Las condiciones `NO_APLICA` quedan fuera del desglose por definición: no
     * son condiciones evaluadas.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarDesgloseEspecialidadesAResumen(array $resumenData): array
    {
        $estadoPorColeccion = [
            'pendiente_atender' => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
            'por_revisar' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
            'cumple_declarado' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
        ];

        $condiciones = [];
        foreach ($estadoPorColeccion as $coleccion => $estado) {
            foreach ($resumenData[$coleccion] ?? [] as $item) {
                $codigo = $item['codigo'] ?? null;

                if ($codigo === null || $codigo === '') {
                    continue;
                }

                $condiciones[] = ['codigo' => $codigo, 'estado' => $estado];
            }
        }

        $resumenData['desglose_especialidades'] = $this->directorioAliados->desglosePorEspecialidad($condiciones);

        return $resumenData;
    }

    /**
     * Adjunta los recursos educativos activos al resumen descriptivo para la interfaz ciudadana.
     * Los recursos se asignan exclusivamente a pendiente_atender, por_revisar y cumple_declarado.
     * no_aplica se mantiene estrictamente sin recursos educativos.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarRecursosEducativosAResumen(array $resumenData): array
    {
        $coleccionesConRecursos = ['pendiente_atender', 'por_revisar', 'cumple_declarado'];

        $codigos = collect($coleccionesConRecursos)
            ->flatMap(fn ($col) => collect($resumenData[$col] ?? [])->pluck('codigo'))
            ->filter()
            ->unique()
            ->values();

        if ($codigos->isEmpty()) {
            return $resumenData;
        }

        $criteriosNormativos = CriterioNormativo::whereIn('codigo_criterio', $codigos)
            ->pluck('id', 'codigo_criterio');

        $recursosPorCriterio = $this->obtenerRecursosPorCriterioIds($criteriosNormativos->values());

        foreach ($coleccionesConRecursos as $coleccion) {
            if (empty($resumenData[$coleccion])) {
                continue;
            }

            foreach ($resumenData[$coleccion] as &$item) {
                $codigo = $item['codigo'] ?? null;
                $criterioId = $criteriosNormativos->get($codigo);
                $recursos = $criterioId ? $recursosPorCriterio->get($criterioId, collect()) : collect();

                $item['recursos_educativos'] = $recursos->map(
                    fn (RecursoEducativo $r) => $this->formatearRecursoEducativo($r)
                )->values()->all();
            }
            unset($item);
        }

        return $resumenData;
    }

    /**
     * Adjunta el bloque de asistencia técnica de DirectorioAliadosService al resumen
     * descriptivo. Es el gemelo de adjuntarRecursosEducativosAResumen(): comparte las
     * mismas colecciones (pendiente_atender, por_revisar y cumple_declarado) y respeta
     * la regla de no_aplica estrictamente sin contenido.
     *
     * El payload viaja embebido en la página porque el directorio es un catálogo estático
     * en memoria: no justifica un endpoint adicional ni una consulta por criterio.
     *
     * @param  array<string, mixed>  $resumenData
     * @return array<string, mixed>
     */
    private function adjuntarAsistenciaTecnicaAResumen(array $resumenData): array
    {
        $coleccionesConAsistencia = ['pendiente_atender', 'por_revisar', 'cumple_declarado'];

        foreach ($coleccionesConAsistencia as $coleccion) {
            if (empty($resumenData[$coleccion])) {
                continue;
            }

            foreach ($resumenData[$coleccion] as &$item) {
                $item['asistencia_tecnica'] = $this->construirAsistenciaTecnica(
                    $item['codigo'] ?? null,
                    $item['titulo'] ?? null,
                    $item['norma_base'] ?? null,
                );
            }
            unset($item);
        }

        return $resumenData;
    }

    /**
     * Traduce un criterio del checklist al contrato que consume
     * NubeAsistenciaModal: guía de autoayuda, rango de costo y aliados sugeridos.
     *
     * @return array<string, mixed>|null
     */
    private function construirAsistenciaTecnica(?string $codigo, ?string $titulo, ?string $norma): ?array
    {
        if (blank($codigo)) {
            return null;
        }

        // El código que viaja al frontend es el del catálogo normativo (CRIT-xx) para
        // que el modal muestre el mismo identificador que el resto del resumen;
        // el servicio internamente lo traduce al código técnico ITSE.
        $codigoOriginal = $codigo;
        $resumen = $this->directorioAliados->obtenerPorCriterio($codigo);

        // Un criterio sin equivalente en el directorio (p. ej. GLP o calderas) igual
        // puede mostrar su guía de autoayuda, por lo que no se descarta el bloque.
        if (! $resumen['criterio_conocido']) {
            return [
                'codigo' => $codigoOriginal,
                'titulo' => $titulo ?? $codigoOriginal,
                'norma' => $norma,
                'guia_autoayuda' => [],
                'rango_costo' => null,
                'aliados' => [],
            ];
        }

        return [
            'codigo' => $codigoOriginal,
            'titulo' => $titulo ?? $resumen['criterio'],
            'norma' => $norma ?? $resumen['norma'],
            'guia_autoayuda' => $resumen['guia_autoayuda'],
            'rango_costo' => $resumen['rango_costo'],
            'aliados' => array_merge([$resumen['aliado']], $resumen['alternativas']),
        ];
    }

    /**
     * Genera un identificador ciudadano único CHK-XXXXXX usando un alfabeto legible de 31 caracteres
     * con entropía criptográfica (random_int) y verificación previa de existencia.
     */
    private function generarCodigoAccesoUnico(): string
    {
        $alfabeto = self::CODIGO_ACCESO_ALFABETO;
        $maxIndex = strlen($alfabeto) - 1;

        do {
            $sufijo = '';
            for ($i = 0; $i < self::CODIGO_ACCESO_LONGITUD; $i++) {
                $sufijo .= $alfabeto[random_int(0, $maxIndex)];
            }
            $codigo = self::CODIGO_ACCESO_PREFIJO.$sufijo;
        } while (Autoevaluacion::where('codigo_acceso', $codigo)->exists());

        return $codigo;
    }

    /**
     * Determina si una QueryException corresponde a una violación de unicidad de codigo_acceso.
     */
    private function esColisionCodigoAcceso(QueryException $e): bool
    {
        $mensaje = $e->getMessage();

        return str_contains($mensaje, 'codigo_acceso')
            || str_contains($mensaje, 'autoevaluaciones_codigo_acceso_unique');
    }
}
