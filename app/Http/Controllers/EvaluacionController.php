<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\EvaluacionHelperTrait;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Requests\StoreAutoevaluacionRequest;
use App\Http\Requests\StoreChecklistDeclaracionesRequest;
use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Services\ApplicabilityEngineService;
use App\Services\DirectorioAliadosService;
use App\Services\GeoLocationService;
use App\Services\ItseRiskService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvaluacionController extends Controller
{
    use EvaluacionHelperTrait;

    public const MSG_NO_AUTORIZADO_EVIDENCIA = 'No autorizado para consultar esta evidencia.';

    public const FORMATO_FECHA_HORA = 'd/m/Y H:i';

    public function __construct(
        protected ItseRiskService $riskService,
        protected GeoLocationService $geoLocationService,
        protected ApplicabilityEngineService $applicabilityEngine,
        protected DirectorioAliadosService $directorioAliados
    ) {}

    public function index(): Response
    {
        return Inertia::render('Evaluacion/Home', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function nueva(): Response
    {
        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
        ]);
    }

    public function iniciarReevaluacion(Request $request, string $uuid): Response|RedirectResponse|JsonResponse
    {
        $evaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();

        $this->validarAutorizacionReevaluacion($request, $evaluacion);

        $respuestaEstado = $this->verificarEstadoRegistradaParaReevaluacion($request, $evaluacion);
        if ($respuestaEstado !== null) {
            return $respuestaEstado;
        }

        // Si se solicita reevaluar sobre una evaluación que ya es una reevaluación,
        // se resuelve la referencia hacia la evaluación original raíz para evitar encadenamiento
        $origenRaiz = $evaluacion->evaluacion_origen_id ? ($evaluacion->evaluacionOrigen ?? $evaluacion) : $evaluacion;

        return Inertia::render('Evaluacion/Nueva', [
            'catalogo' => $this->riskService->getCatalogoChecklist(),
            'reevaluacionDe' => $this->construirDatosReevaluacion($evaluacion, $origenRaiz),
        ]);
    }

    public function store(StoreAutoevaluacionRequest $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validated();

        $evaluacionOrigenId = $this->resolverEvaluacionOrigenId($request, $validated);
        if ($evaluacionOrigenId instanceof RedirectResponse || $evaluacionOrigenId instanceof JsonResponse) {
            return $evaluacionOrigenId;
        }

        // Normalización: los estados declarados son la fuente de verdad; la
        // marca booleana `cumple` se deriva para evitar inconsistencias entre
        // ambos campos cuando el cliente los envía contradictorios.
        $checklist = collect($request->input('checklist', []))->map(function (array $item): array {
            $estado = (string) ($item['estado'] ?? '');

            return array_merge($item, ['cumple' => $estado === 'CUMPLE']);
        })->values()->all();

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

        $caracteristicasDeclaradas = $this->extraerCaracteristicasDeclaradas($validated);

        $datosCreacion = [
            'uuid' => $uuid,
            'hash_integridad' => $hashIntegridad,
            'caracteristicas_declaradas' => $caracteristicasDeclaradas,
            'porcentaje_cumplimiento' => $porcentajeCumplimiento,
            'semaforo' => $semaforo,
            'checklist' => $checklist,
        ];

        $autoevaluacion = $this->crearAutoevaluacionConReintentos(
            $request,
            $validated,
            $evaluacionOrigenId,
            $datosCreacion
        );

        $request->session()->put('guest_authorized_uuid', $autoevaluacion->uuid_trazabilidad);
        if ($autoevaluacion->session_token) {
            $request->session()->put('guest_session_token', $autoevaluacion->session_token);
        }

        $mensaje = $evaluacionOrigenId !== null
            ? 'Reevaluación preventiva iniciada. Actualiza tus declaraciones para el local.'
            : 'Autoevaluación iniciada correctamente.';

        return redirect()->route('autoevaluacion.checklist', ['uuid' => $autoevaluacion->uuid_trazabilidad])
            ->with('success', $mensaje);
    }

    public function resultado(Request $request, string $uuid): Response|RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'reevaluaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->validarAutorizacionConsulta($request, $autoevaluacion);

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

    public function simulacionRevision(string $uuid): Response
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        return Inertia::render('Evaluacion/SimulacionRevision', [
            'autoevaluacion' => $autoevaluacion,
        ]);
    }

    public function guardarSimulacion(Request $request, string $uuid): RedirectResponse
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

    public function panelSubsanacion(Request $request, string $uuid): Response
    {
        $autoevaluacion = Autoevaluacion::with(['simulaciones.subsanaciones'])
            ->where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);

        $ultimaRevision = $autoevaluacion->simulaciones->sortByDesc('created_at')->first();

        return Inertia::render('Evaluacion/Subsanacion', [
            'autoevaluacion' => $autoevaluacion,
            'ultimaRevision' => $ultimaRevision ? $ultimaRevision->load('subsanaciones') : null,
        ]);
    }

    public function guardarSubsanacion(Request $request, string $uuid): RedirectResponse
    {
        $autoevaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)->firstOrFail();
        $this->autorizarAccesoAutoevaluacion($request, $autoevaluacion);
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
                'user_id' => Auth::id(),
                'estado_anterior' => $estadoAnterior,
                'estado_nuevo' => $estadoSubsanacion,
                'evidencia_url' => $evidenciaUrl,
                'comentario' => $validated['descripcion_subsanacion'],
                'ip_address' => $request->ip(),
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
            $checklistActualizado = collect($autoevaluacion->detalle_checklist ?? [])->map(function (array $item) use ($subsanacionesDeclaradas): array {
                if (in_array($item['codigo'] ?? '', $subsanacionesDeclaradas, true)) {
                    $item['estado'] = 'CUMPLE';
                    $item['cumple'] = true;
                }

                return $item;
            })->values()->all();

            $autoevaluacion->update([
                'semaforo' => 'VERDE',
                'porcentaje_cumplimiento' => 100.0,
                'detalle_checklist' => $checklistActualizado,
                'total_pendiente_atender' => 0,
            ]);

            $revision->update([
                'resultado' => 'SIN_OBSERVACIONES',
                'porcentaje_revision' => 100.0,
                'metrica_gap' => 0.0,
                'total_observaciones' => 0,
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
                abort(403, self::MSG_NO_AUTORIZADO_EVIDENCIA);
            }
        } else {
            $tokenSesion = $request->cookie('guest_session_token');

            if (! filled($autoevaluacion->session_token)
                || ! filled($tokenSesion)
                || ! hash_equals((string) $autoevaluacion->session_token, (string) $tokenSesion)) {
                abort(403, self::MSG_NO_AUTORIZADO_EVIDENCIA);
            }
        }

        $path = $subsanacion->evidencia_url;

        if (! filled($path)) {
            abort(404);
        }

        /** @var FilesystemAdapter $disco */
        $disco = Storage::disk('local');

        if (! $disco->exists($path)) {
            abort(404);
        }

        return $disco->response($path);
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

        $this->validarAutorizacionInforme($request, $autoevaluacion);

        $revision = $autoevaluacion->simulacionRevision;

        $verificaciones = $revision?->detalle_revision ?? [];
        $codigosObservados = array_keys(array_filter($verificaciones, fn ($v) => $v === false));

        $subsanaciones = collect($revision?->subsanaciones ?? []);
        $codigosSubsanados = $subsanaciones->where('estado', 'SUBSANADO_DECLARADO')->pluck('codigo_item')->all();

        $nombresPorCodigo = collect($this->riskService->getCatalogoChecklist())->keyBy('codigo');

        $checklistRaw = $autoevaluacion->detalle_checklist ?? [];

        $detalleChecklist = $this->construirDetalleChecklistInforme($checklistRaw, $nombresPorCodigo);

        // Resumen cuantitativo por estado de las condiciones
        $totalCondicionesEvaluables = count(array_filter(
            $checklistRaw,
            fn ($item) => ($item['estado'] ?? 'CUMPLE') !== 'NA'
        ));

        $conformesIniciales = count(array_filter(
            $checklistRaw,
            function (array $item) use ($codigosSubsanados): bool {
                $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
                $codigo = $item['codigo'] ?? '';

                return $estado === 'CUMPLE' && ! in_array($codigo, $codigosSubsanados, true);
            }
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
        $porcentajeSubsanado = 0;
        if ($totalObservadas > 0) {
            $porcentajeSubsanado = (int) round(($subsanadasDeclaradas / $totalObservadas) * 100);
        } elseif ($totalCondicionesEvaluables > 0) {
            $porcentajeSubsanado = 100;
        }

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
                'fecha_subsanacion' => $subsanacion->fecha_subsanacion?->format(self::FORMATO_FECHA),
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
            'fecha' => $autoevaluacion->evaluacionOrigen->created_at?->format(self::FORMATO_FECHA_HORA) ?? $autoevaluacion->evaluacionOrigen->created_at?->format(self::FORMATO_FECHA),
            'semaforo' => $autoevaluacion->evaluacionOrigen->semaforo,
            'porcentaje_cumplimiento' => $autoevaluacion->evaluacionOrigen->porcentaje_cumplimiento,
        ] : null;

        return Inertia::render('Evaluacion/InformePreventivo', [
            'autoevaluacion' => $autoevaluacion->paraInforme(),
            'esReevaluacion' => $esReevaluacion,
            'evaluacionOrigen' => $evaluacionOrigen,
            'codigoInforme' => $codigoInforme,
            'fechaEmision' => now()->format(self::FORMATO_FECHA_HORA),
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
                $registro = Autoevaluacion::whereKey($autoevaluacion->id)
                    ->lockForUpdate()
                    ->first();

                if (! $registro || $registro->user_id !== null) {
                    return 0;
                }

                $registro->update(['user_id' => Auth::id()]);

                return 1;
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
     * Panel Principal del Contribuyente (Dashboard Ciudadano).
     * Presenta los KPIs de seguridad del negocio y la cartera de locales comerciales.
     */
    public function dashboard(Request $request): Response
    {
        $user = $request->user();
        $autoevaluaciones = Autoevaluacion::where('user_id', $user->id)
            ->with(['simulacionRevision', 'simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->latest('id')
            ->get();

        $records = $autoevaluaciones
            ->map(function (Autoevaluacion $item): array {
                $data = $this->formatearItemMisEvaluaciones($item);
                $data['sector_huancayo'] = $item->sector_huancayo;
                $data['usa_glp'] = (bool) $item->usa_glp;
                $data['galones_glp'] = $item->galones_glp;

                return $data;
            })
            ->values();

        $kpis = $this->calcularKpisDashboard($records);

        return Inertia::render('Dashboard/Dashboard', [
            'records' => $records,
            'kpis' => $kpis,
        ]);
    }

    /**
     * Calcula los KPIs consolidados del dashboard ciudadano.
     *
     * @param  Collection<int, array<string, mixed>>  $records
     * @return array<string, mixed>
     */
    private function calcularKpisDashboard(Collection $records): array
    {
        $totalLocales = $records->count();

        $aprobados = $records->filter(function (array $r): bool {
            return ($r['semaforo'] ?? '') === 'VERDE'
                || (float) ($r['porcentaje_cumplimiento'] ?? 0) >= 100.0;
        })->count();

        $observados = $records->filter(function (array $r): bool {
            return ($r['semaforo'] ?? '') === 'ROJO'
                || (int) ($r['resumen_subsanaciones']['pendientes'] ?? 0) > 0;
        })->count();

        $enProceso = $records->filter(function (array $r): bool {
            return ($r['estado'] ?? '') === Autoevaluacion::ESTADO_INICIADA
                || ($r['semaforo'] ?? '') === 'AMBAR';
        })->count();

        $riesgos = $records->pluck('nivel_riesgo')->filter()->countBy();
        $riesgoDominante = $riesgos->sortDesc()->keys()->first() ?? 'MEDIO';

        return [
            'total_locales' => $totalLocales,
            'aprobados' => $aprobados,
            'observados' => $observados,
            'en_proceso' => $enProceso,
            'riesgo_dominante' => (string) $riesgoDominante,
        ];
    }

    /**
     * Muestra la vista de perfil de usuario contribuyente.
     */
    public function perfil(Request $request): Response
    {
        $user = $request->user();
        $ultima = Autoevaluacion::where('user_id', $user->id)->latest('id')->first();

        $user->setAttribute('razon_social', $ultima?->nombre_comercio ?? '');
        $user->setAttribute('nombre_comercial', $ultima?->nombre_comercio ?? '');
        $user->setAttribute('direccion_fiscal', $ultima?->direccion ?? '');

        return Inertia::render('Perfil/PerfilUsuario', [
            'user' => $user,
        ]);
    }

    /**
     * Actualiza los datos de perfil y contacto del usuario contribuyente.
     */
    public function updatePerfil(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();

        $datosValidados = $request->validated();
        $user->name = $datosValidados['name'];
        $user->email = $datosValidados['email'];

        if ($request->has('telefono')) {
            $user->telefono = $request->input('telefono');
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($request->hasAny(['nombre_comercial', 'direccion_fiscal', 'razon_social'])) {
            $ultima = Autoevaluacion::where('user_id', $user->id)->latest('id')->first();
            if ($ultima !== null && ! $ultima->estaRegistrada()) {
                $nombre = $request->input('nombre_comercial') ?? $request->input('razon_social');
                $actualizaciones = array_filter([
                    'nombre_comercio' => $nombre,
                    'direccion' => $request->input('direccion_fiscal'),
                ], fn ($val) => filled($val));

                if (! empty($actualizaciones)) {
                    $ultima->update($actualizaciones);
                }
            }
        }

        return redirect()->route('perfil.show')->with('success', 'Perfil actualizado correctamente.');
    }

    /**
     * Panel de retención ciudadana e historial preventivo: lista las autoevaluaciones
     * guardadas por el usuario autenticado con su estado del ciclo de vida, conteos
     * descriptivos normativos, trazabilidad criptográfica y soporte transicional legacy.
     */
    public function misEvaluaciones(Request $request): Response|JsonResponse
    {
        $autoevaluaciones = Autoevaluacion::with(['simulaciones.subsanaciones', 'evaluacionOrigen', 'respuestas'])
            ->where('user_id', Auth::id())
            ->latest('id')
            ->get()
            ->map(fn (Autoevaluacion $autoevaluacion): array => $this->formatearItemMisEvaluaciones($autoevaluacion))
            ->values();

        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            return response()->json([
                'autoevaluaciones' => $autoevaluaciones,
            ], 200, [
                'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        }

        $kpis = $this->calcularKpisDashboard($autoevaluaciones);

        return Inertia::render('Evaluacion/MisAutoevaluaciones', [
            'autoevaluaciones' => $autoevaluaciones,
            'records' => $autoevaluaciones,
            'kpis' => $kpis,
        ]);
    }

    private function formatearItemMisEvaluaciones(Autoevaluacion $autoevaluacion): array
    {
        $subsanaciones = $autoevaluacion->simulaciones
            ->flatMap(fn ($revision) => $revision->subsanaciones);

        $checklist = $autoevaluacion->detalle_checklist ?? [];
        $esFlujoNuevo = $autoevaluacion->esFlujoNuevo();
        $conteoCondiciones = $this->contarCondicionesChecklist($checklist);

        $datosNormativos = $this->resolverConteosYDesglose($autoevaluacion, $esFlujoNuevo, $conteoCondiciones);
        $conteoCondiciones = $datosNormativos['conteo_condiciones'];
        $conteosNormativos = $datosNormativos['conteos_normativos'];
        $desgloseEspecialidades = $datosNormativos['desglose_especialidades'];

        $metricas = $this->resolverMetricasCumplimientoItem($autoevaluacion, $esFlujoNuevo, $conteoCondiciones);
        $porcentaje = $metricas['porcentaje'];
        $semaforo = $metricas['semaforo'];

        $clasificacionTramite = $this->clasificarModalidadTramite($autoevaluacion);

        return [
            'id' => $autoevaluacion->id,
            'uuid_trazabilidad' => $autoevaluacion->uuid_trazabilidad,
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'evaluacion_origen_id' => $autoevaluacion->evaluacion_origen_id,
            'evaluacion_origen_uuid' => $autoevaluacion->evaluacionOrigen?->uuid_trazabilidad,
            'nombre_comercio' => $autoevaluacion->nombre_comercio,
            'funcion_economica' => $autoevaluacion->funcion_economica,
            'ruc' => $autoevaluacion->ruc,
            'distrito' => $autoevaluacion->distrito,
            'direccion' => $autoevaluacion->direccion,
            'area_m2' => $autoevaluacion->area_m2,
            'pisos' => $autoevaluacion->pisos,
            'aforo' => $autoevaluacion->aforo,
            'tipo_tramite' => $clasificacionTramite['tipo_tramite'],
            'nivel_riesgo' => $clasificacionTramite['nivel_riesgo'],
            'clasificacion_tramite' => $clasificacionTramite,
            'estado' => $autoevaluacion->estado ?? Autoevaluacion::ESTADO_INICIADA,
            'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
            'es_flujo_nuevo' => $esFlujoNuevo,
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'semaforo' => $semaforo,
            'porcentaje_cumplimiento' => $porcentaje,
            'fecha' => $autoevaluacion->created_at?->format(self::FORMATO_FECHA_HORA),
            'fecha_corta' => $autoevaluacion->created_at?->format(self::FORMATO_FECHA),
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
    }

    private function contarCondicionesChecklist(array $checklist): array
    {
        return [
            'total' => count($checklist),
            'cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'CUMPLE')),
            'no_cumple' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? ($i['cumple'] ? 'CUMPLE' : 'NO_CUMPLE')) === 'NO_CUMPLE')),
            'por_revisar' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'POR_REVISAR')),
            'na' => count(array_filter($checklist, fn ($i) => ($i['estado'] ?? '') === 'NA')),
        ];
    }

    private function resolverConteosYDesglose(Autoevaluacion $autoevaluacion, bool $esFlujoNuevo, array $conteoCondiciones): array
    {
        if ($esFlujoNuevo) {
            return $this->resolverConteosYDesgloseFlujoNuevo($autoevaluacion);
        }

        $checklist = $autoevaluacion->detalle_checklist ?? [];
        if (! empty($checklist)) {
            return $this->resolverConteosYDesgloseLegacy($checklist, $conteoCondiciones);
        }

        return [
            'conteos_normativos' => null,
            'desglose_especialidades' => null,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverConteosYDesgloseFlujoNuevo(Autoevaluacion $autoevaluacion): array
    {
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

        $conteoCondiciones = [
            'total' => $conteosNormativos['total_criterios_aplicables'],
            'cumple' => $conteosNormativos['cumple_declarado'],
            'no_cumple' => $conteosNormativos['pendiente_atender'],
            'por_revisar' => $conteosNormativos['por_revisar'],
            'na' => $conteosNormativos['no_aplica'],
        ];

        $desgloseEspecialidades = $this->adjuntarDesgloseEspecialidadesAResumen($resumenData)['desglose_especialidades'];

        return [
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverConteosYDesgloseLegacy(array $checklist, array $conteoCondiciones): array
    {
        $totalAplicables = $conteoCondiciones['total'] - $conteoCondiciones['na'];
        $conteosNormativos = [
            'total_criterios_aplicables' => $totalAplicables,
            'cumple_declarado' => $conteoCondiciones['cumple'],
            'pendiente_atender' => $conteoCondiciones['no_cumple'],
            'por_revisar' => $conteoCondiciones['por_revisar'],
            'no_aplica' => $conteoCondiciones['na'],
        ];

        $condicionesAdaptadas = [];
        foreach ($checklist as $item) {
            $est = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
            if ($est === 'NA') {
                continue;
            }
            $condicionesAdaptadas[] = [
                'codigo' => $item['codigo'] ?? '',
                'estado' => match ($est) {
                    'CUMPLE' => ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO,
                    'POR_REVISAR' => ApplicabilityEngineService::ESTADO_POR_REVISAR,
                    default => ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                },
            ];
        }

        $desgloseEspecialidades = $this->directorioAliados->desglosePorEspecialidad($condicionesAdaptadas);

        return [
            'conteos_normativos' => $conteosNormativos,
            'desglose_especialidades' => $desgloseEspecialidades,
            'conteo_condiciones' => $conteoCondiciones,
        ];
    }

    private function resolverMetricasCumplimientoItem(Autoevaluacion $autoevaluacion, bool $esFlujoNuevo, array $conteoCondiciones): array
    {
        $porcentaje = (float) $autoevaluacion->porcentaje_cumplimiento;
        $semaforo = $autoevaluacion->semaforo;

        $debeRecalcular = ! $autoevaluacion->estaRegistrada()
            || $porcentaje <= 0.0
            || empty($semaforo)
            || $semaforo === 'PENDIENTE';

        if ($esFlujoNuevo && $conteoCondiciones['total'] > 0 && $debeRecalcular) {
            $metricas = $this->riskService->calcularMetricasCumplimiento(
                $conteoCondiciones['total'],
                $conteoCondiciones['cumple']
            );
            $porcentaje = $metricas['porcentaje'];
            $semaforo = $metricas['semaforo'];
        }

        return [
            'porcentaje' => $porcentaje,
            'semaforo' => $semaforo,
        ];
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

        if (! $request->wantsJson() && ! $request->is(self::RUTA_API_PATTERN)) {
            return Inertia::render('Evaluacion/Checklist', [
                'autoevaluacion' => [
                    'id' => $autoevaluacion->id,
                    'uuid' => $autoevaluacion->uuid_trazabilidad,
                    'nombre_comercio' => $autoevaluacion->nombre_comercio,
                    'direccion' => $autoevaluacion->direccion,
                    'estado' => $autoevaluacion->estado,
                    'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
                    'hash_integridad' => $autoevaluacion->hash_integridad,
                ],
                'checklist' => $checklist,
            ]);
        }

        return response()->json($checklist, 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
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

        // Actualización inmediata de métricas agregadas en la entidad padre (MySQL)
        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $conteos = $resumenData['conteos'];
        $metricas = $this->riskService->calcularMetricasCumplimiento(
            (int) ($conteos['total_criterios_aplicables'] ?? 0),
            (int) ($conteos['total_cumple_declarado'] ?? 0)
        );

        $autoevaluacion->update([
            'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
            'total_cumple_declarado' => $conteos['total_cumple_declarado'],
            'total_pendiente_atender' => $conteos['total_pendiente_atender'],
            'total_por_revisar' => $conteos['total_por_revisar'],
            'total_no_aplica' => $conteos['total_no_aplica'],
            'porcentaje_cumplimiento' => $metricas['porcentaje'],
            'semaforo' => $metricas['semaforo'],
        ]);

        $checklistActualizado = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $checklistActualizado = $this->adjuntarRecursosEducativosAChecklist($checklistActualizado);

        return response()->json([
            'mensaje' => 'Declaraciones registradas exitosamente.',
            'guardadas' => $respuestasGuardadas,
            'checklist' => $checklistActualizado,
        ], 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
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
            return $this->respuestaAutoevaluacionYaRegistrada($request, $autoevaluacion);
        }

        // 2. Reconstruir checklist y validar que todos los criterios aplicables tengan declaración
        $checklist = $this->applicabilityEngine->generarChecklistDinamico($autoevaluacion);
        $pendientes = $this->obtenerCriteriosPendientesParaCierre($checklist);

        if (count($pendientes) > 0) {
            return $this->respuestaCriteriosPendientesCierre($request, $autoevaluacion, $pendientes);
        }

        // 3. Generar snapshot canónico normalizado y hash determinístico SHA-256
        $payloadCanonico = $this->applicabilityEngine->generarPayloadCanonico($autoevaluacion);
        $this->applicabilityEngine->normalizarArrayDeterminista($payloadCanonico);
        $jsonCanonico = (string) json_encode($payloadCanonico, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hashIntegridad = hash('sha256', $jsonCanonico);

        $resumenData = $this->applicabilityEngine->generarResumenDescriptivo($autoevaluacion);
        $conteos = $resumenData['conteos'];

        $metricas = $this->riskService->calcularMetricasCumplimiento(
            (int) ($conteos['total_criterios_aplicables'] ?? 0),
            (int) ($conteos['total_cumple_declarado'] ?? 0)
        );
        $porcentajeCumplimiento = $metricas['porcentaje'];
        $semaforo = $metricas['semaforo'];

        // 4. Transacción atómica para sellar la autoevaluación con su snapshot inmutable
        DB::transaction(function () use ($autoevaluacion, $payloadCanonico, $hashIntegridad, $conteos, $porcentajeCumplimiento, $semaforo) {
            $autoevaluacion->update([
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => now(),
                'hash_integridad' => $hashIntegridad,
                'payload_canonico' => $payloadCanonico,
                'porcentaje_cumplimiento' => $porcentajeCumplimiento,
                'semaforo' => $semaforo,
                'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
                'total_cumple_declarado' => $conteos['total_cumple_declarado'],
                'total_pendiente_atender' => $conteos['total_pendiente_atender'],
                'total_por_revisar' => $conteos['total_por_revisar'],
                'total_no_aplica' => $conteos['total_no_aplica'],
            ]);
        });

        if ($request->wantsJson() || $request->is(self::RUTA_API_PATTERN)) {
            $resultado = response()->json([
                'mensaje' => 'Autoevaluación registrada correctamente y protegida contra modificaciones.',
                'estado' => Autoevaluacion::ESTADO_REGISTRADA,
                'registrada_at' => $autoevaluacion->fresh()->registrada_at?->toIso8601String(),
                'hash_integridad' => $hashIntegridad,
                'uuid' => $autoevaluacion->uuid_trazabilidad,
                'porcentaje_cumplimiento' => $porcentajeCumplimiento,
                'semaforo' => $semaforo,
            ], 200);
        } elseif (Auth::check()) {
            $resultado = redirect()->route('mis-autoevaluaciones')
                ->with('success', 'Autoevaluación actualizada correctamente');
        } else {
            $resultado = redirect()->route('autoevaluacion.resumen', ['uuid' => $autoevaluacion->uuid_trazabilidad])
                ->with('success', 'Autoevaluación registrada correctamente y protegida contra modificaciones.');
        }

        return $resultado;
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
            'distrito' => $autoevaluacion->distrito,
            'direccion' => $autoevaluacion->direccion,
            'codigo_acceso' => $autoevaluacion->codigo_acceso,
            'caracteristicas_declaradas' => $autoevaluacion->caracteristicas_declaradas,
            'estado' => $autoevaluacion->estado,
            'registrada_at' => $autoevaluacion->registrada_at?->format(self::FORMATO_FECHA_HORA),
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
            'clasificacion_tramite' => $this->clasificarModalidadTramite($autoevaluacion),
        ];

        if (! $request->wantsJson() && ! $request->is(self::RUTA_API_PATTERN)) {
            return Inertia::render('Evaluacion/Resumen', $payload);
        }

        return response()->json($payload, 200, [
            'Cache-Control' => self::CACHE_CONTROL_NO_STORE,
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function anexoOficial(string $uuid, Request $request): Response
    {
        $evaluacion = Autoevaluacion::where('uuid_trazabilidad', $uuid)
            ->firstOrFail();

        $this->autorizarAccesoAutoevaluacion($request, $evaluacion);

        $numero = $request->query('numero', '4');
        $esExAnte = in_array(strtoupper($evaluacion->nivel_riesgo ?? ''), ['ALTO', 'MUY ALTO', 'MUY_ALTO']);

        // Mapear condiciones/criterios a partir del checklist o respuestas
        $condiciones = collect($evaluacion->detalle_checklist ?? [])->map(function ($item) {
            return [
                'codigo' => $item['codigo'] ?? '',
                'nombre' => $item['nombre'] ?? $item['pregunta'] ?? $item['codigo'] ?? '',
                'estado' => $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE'),
                'observacion' => $item['observacion'] ?? '',
                'es_critico' => (bool) ($item['es_critico'] ?? false),
            ];
        })->values();

        $cumplen = $condiciones->filter(fn ($c) => in_array($c['estado'], ['CUMPLE', 'CUMPLE_DECLARADO']))->count();
        $total = $condiciones->count();

        return inertia('Evaluacion/AnexoOficial', [
            'numero' => (string) $numero,
            'autoevaluacion' => $evaluacion,
            'titular' => [
                'nombre_comercial' => $evaluacion->nombre_comercio ?? '',
                'razon_social' => $evaluacion->nombre_comercio ?? '',
                'ruc' => $evaluacion->ruc ?? '',
                'direccion' => $evaluacion->sector_huancayo ?? '',
                'giro' => $evaluacion->funcion_economica ?? '',
            ],
            'riesgoTramite' => [
                'nivel_riesgo' => $evaluacion->nivel_riesgo ?? 'MEDIO',
                'es_ex_ante' => $esExAnte,
                'tipo_tramite' => $evaluacion->tipo_tramite ?? ($esExAnte ? 'EX_ANTE' : 'EX_POST'),
            ],
            'clasificacion' => [
                'nivel' => $evaluacion->nivel_riesgo ?? 'MEDIO',
                'es_previa' => $esExAnte,
            ],
            'condiciones' => $condiciones,
            'conteo' => [
                'total' => $total,
                'cumple' => $cumplen,
                'no_cumple' => $total - $cumplen,
                'porcentaje' => (float) ($evaluacion->porcentaje_cumplimiento ?? 0),
            ],
            'codigoDocumento' => 'ITSE-'.substr($evaluacion->uuid_trazabilidad, 0, 8),
            'fechaEmision' => optional($evaluacion->created_at)->format(self::FORMATO_FECHA) ?? date(self::FORMATO_FECHA),
            'urlResumen' => route('autoevaluacion.resumen', ['uuid' => $uuid]),
        ]);
    }
}
