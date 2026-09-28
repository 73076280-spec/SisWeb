<?php

namespace App\Services;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use Illuminate\Support\Collection;

class ApplicabilityEngineService
{
    /**
     * Estados canónicos de respuesta autorizados por el modelo cerrado de CheckITSE.
     */
    public const ESTADO_CUMPLE_DECLARADO = 'CUMPLE_DECLARADO';

    public const ESTADO_PENDIENTE_ATENDER = 'PENDIENTE_ATENDER';

    public const ESTADO_POR_REVISAR = 'POR_REVISAR';

    public const ESTADO_NO_APLICA = 'NO_APLICA';

    public const ESTADOS_CANONICOS = [
        self::ESTADO_CUMPLE_DECLARADO,
        self::ESTADO_PENDIENTE_ATENDER,
        self::ESTADO_POR_REVISAR,
        self::ESTADO_NO_APLICA,
    ];

    /**
     * Estados que el ciudadano puede declarar directamente en su autoevaluación.
     * Recordatorio estricto: NO_APLICA NO es una opción seleccionable por el ciudadano;
     * es un estado asignado exclusivamente por el sistema.
     */
    public const RESPUESTAS_CIUDADANAS_PERMITIDAS = [
        self::ESTADO_CUMPLE_DECLARADO,
        self::ESTADO_PENDIENTE_ATENDER,
        self::ESTADO_POR_REVISAR,
    ];

    /**
     * Códigos oficiales congelados para el catálogo normativo de Huancayo.
     */
    public const CODIGOS_ACTIVOS = [
        'CRIT-01',
        'CRIT-02A',
        'CRIT-02B',
        'CRIT-03',
        'CRIT-04',
        'CRIT-05',
        'CRIT-06',
        'CRIT-07',
        'CRIT-08',
        'CRIT-10',
        'CRIT-11',
        'CRIT-13',
        'CRIT-14A',
    ];

    public const CODIGOS_SUSPENDIDOS = [
        'CRIT-09',
        'CRIT-12',
        'CRIT-14B',
        'CRIT-15',
        'CRIT-16',
        'CRIT-17',
    ];

    /**
     * Obtiene la lista oficial de estados canónicos.
     *
     * @return array<string>
     */
    public function getEstadosCanonicos(): array
    {
        return self::ESTADOS_CANONICOS;
    }

    /**
     * Verifica si una cadena corresponde a un estado canónico autorizado.
     */
    public function esEstadoCanonico(string $estado): bool
    {
        return in_array($estado, self::ESTADOS_CANONICOS, true);
    }

    /**
     * Verifica si un estado corresponde a una opción declarable por el ciudadano.
     * NO_APLICA retorna siempre false.
     */
    public function esRespuestaCiudadanaValida(string $estado): bool
    {
        return in_array($estado, self::RESPUESTAS_CIUDADANAS_PERMITIDAS, true);
    }

    /**
     * Obtiene los 19 criterios normativos del catálogo congelado.
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCatalogoCompleto(): Collection
    {
        return CriterioNormativo::orderBy('orden')->orderBy('id')->get();
    }

    /**
     * Obtiene exclusivamente los 13 criterios normativos activos para autoevaluación.
     * Los 6 criterios suspendidos quedan excluidos de forma estricta.
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCriteriosActivos(): Collection
    {
        return CriterioNormativo::activos()
            ->ciudadanos()
            ->whereNotIn('codigo_criterio', self::CODIGOS_SUSPENDIDOS)
            ->orderBy('orden')
            ->orderBy('id')
            ->get();
    }

    /**
     * Obtiene los 6 criterios suspendidos normativamente (fuera del checklist activo).
     *
     * @return Collection<int, CriterioNormativo>
     */
    public function getCriteriosSuspendidos(): Collection
    {
        return CriterioNormativo::suspendidos()
            ->orderBy('orden')
            ->orderBy('id')
            ->get();
    }

    /**
     * Determina si un criterio es evaluable por el motor de aplicabilidad.
     * Los 6 criterios suspendidos (activo = false) quedan totalmente excluidos del motor:
     * NO se evalúan, NO generan respuesta y NO deben convertirse en NO_APLICA.
     */
    public function esCriterioEvaluable(CriterioNormativo|string $criterio): bool
    {
        $codigo = $criterio instanceof CriterioNormativo ? $criterio->codigo_criterio : $criterio;
        $activo = $criterio instanceof CriterioNormativo ? (bool) $criterio->activo : true;

        if (! $activo || in_array($codigo, self::CODIGOS_SUSPENDIDOS, true)) {
            return false;
        }

        return in_array($codigo, self::CODIGOS_ACTIVOS, true);
    }

    /**
     * Evalúa la aplicabilidad de un criterio normativo frente al contexto del establecimiento.
     *
     * Reglas fundamentales de aplicabilidad:
     * 1. Separación de conceptos: "criterio activo" ≠ "criterio aplicable".
     * 2. Regla de valores desconocidos: NULL ≠ false ≠ NO_APLICA.
     * 3. CRIT-10 (GLP):
     *    - usa_glp === true  => aplicable
     *    - usa_glp === false => NO_APLICA
     *    - usa_glp === null  => requiere información (NO convertir a false ni a NO_APLICA)
     * 4. CRIT-02A (Clase K): Condicional gobernado por 'tiene_equipos_fritura' (?bool).
     * 5. CRIT-11 (Escaleras): Condicional gobernado por 'tiene_escaleras' (?bool). NO depende de 'pisos'.
     * 6. CRIT-13 (Estanterías): Condicional gobernado por 'tiene_estanterias_altas' (?bool). PROHIBIDA regla de 1.50 m.
     * 7. CRIT-05 (Puesta a tierra): Tipo C (declaración de constancia ≤25 Ω, sin medición física).
     * 8. Criterios suspendidos (activo = false): Quedan excluidos del motor antes de evaluar;
     *    no se evalúan, no generan respuesta y NO generan NO_APLICA.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    public function evaluarCriterio(CriterioNormativo $criterio, Autoevaluacion|array $contexto): array
    {
        $codigo = $criterio->codigo_criterio;

        // Criterios suspendidos (activo = false):
        // NO se evalúan, NO generan respuesta y NO deben convertirse en NO_APLICA.
        if (! $this->esCriterioEvaluable($criterio)) {
            throw new \InvalidArgumentException("El criterio [{$codigo}] está suspendido normativamente (activo = false) y no forma parte del conjunto evaluable. No se evalúa ni genera NO_APLICA.");
        }

        $params = $this->normalizarContexto($contexto);

        // 1. CRIT-10: Instalación segura de GLP (usa_glp)
        if ($codigo === 'CRIT-10') {
            $usaGlp = $params['usa_glp'];

            if ($usaGlp === false) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => false,
                    'estado_sugerido' => self::ESTADO_NO_APLICA,
                    'requiere_informacion' => false,
                    'motivo' => 'El establecimiento declaró expresamente no utilizar GLP (usa_glp = false).',
                ];
            }

            if ($usaGlp === true) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => true,
                    'estado_sugerido' => null,
                    'requiere_informacion' => false,
                    'motivo' => 'Aplica por declaración expresa de uso de GLP (usa_glp = true).',
                ];
            }

            // usaGlp === null: NULL ≠ false ≠ NO_APLICA. Información insuficiente.
            return [
                'codigo' => $codigo,
                'criterio_id' => $criterio->id,
                'titulo' => $criterio->titulo,
                'tipo_criterio' => $criterio->tipo_criterio,
                'activo' => true,
                'aplicable' => null,
                'estado_sugerido' => null,
                'requiere_informacion' => true,
                'motivo' => 'Información sobre GLP pendiente de declaración (usa_glp = null). NULL ≠ false y NULL ≠ NO_APLICA; se requiere información para determinar aplicabilidad.',
            ];
        }

        // 2. CRIT-02A: Extintor especializado Clase K (tiene_equipos_fritura)
        if ($codigo === 'CRIT-02A') {
            $tieneEquiposFritura = $params['tiene_equipos_fritura'];

            if ($tieneEquiposFritura === false) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => false,
                    'estado_sugerido' => self::ESTADO_NO_APLICA,
                    'requiere_informacion' => false,
                    'motivo' => 'El establecimiento declaró expresamente no contar con equipos de fritura ni cocción con aceites/grasas (tiene_equipos_fritura = false).',
                ];
            }

            if ($tieneEquiposFritura === true) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => true,
                    'estado_sugerido' => null,
                    'requiere_informacion' => false,
                    'motivo' => 'Aplica por declaración expresa de uso de equipos de fritura o cocción con aceites/grasas (tiene_equipos_fritura = true).',
                ];
            }

            return [
                'codigo' => $codigo,
                'criterio_id' => $criterio->id,
                'titulo' => $criterio->titulo,
                'tipo_criterio' => $criterio->tipo_criterio,
                'activo' => true,
                'aplicable' => null,
                'estado_sugerido' => null,
                'requiere_informacion' => true,
                'motivo' => 'Información sobre equipos de fritura o cocción pendiente de declaración (tiene_equipos_fritura = null). NULL ≠ false y NULL ≠ NO_APLICA; se requiere información para determinar aplicabilidad.',
            ];
        }

        // 3. CRIT-11: Escaleras con pasamanos y peldaños antideslizantes (tiene_escaleras)
        if ($codigo === 'CRIT-11') {
            $tieneEscaleras = $params['tiene_escaleras'];

            if ($tieneEscaleras === false) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => false,
                    'estado_sugerido' => self::ESTADO_NO_APLICA,
                    'requiere_informacion' => false,
                    'motivo' => 'El establecimiento declaró expresamente no contar con escaleras de circulación (tiene_escaleras = false).',
                ];
            }

            if ($tieneEscaleras === true) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => true,
                    'estado_sugerido' => null,
                    'requiere_informacion' => false,
                    'motivo' => 'Aplica por declaración expresa de existencia física de escaleras de circulación en el establecimiento (tiene_escaleras = true).',
                ];
            }

            return [
                'codigo' => $codigo,
                'criterio_id' => $criterio->id,
                'titulo' => $criterio->titulo,
                'tipo_criterio' => $criterio->tipo_criterio,
                'activo' => true,
                'aplicable' => null,
                'estado_sugerido' => null,
                'requiere_informacion' => true,
                'motivo' => 'Información sobre existencia de escaleras de circulación pendiente de declaración (tiene_escaleras = null). NULL ≠ false y NULL ≠ NO_APLICA; no se infiere de pisos ni se asume aplicable automáticamente.',
            ];
        }

        // 4. CRIT-13: Mobiliario alto y estanterías con arriostramiento antisísmico (tiene_estanterias_altas)
        if ($codigo === 'CRIT-13') {
            $tieneEstanteriasAltas = $params['tiene_estanterias_altas'];

            if ($tieneEstanteriasAltas === false) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => false,
                    'estado_sugerido' => self::ESTADO_NO_APLICA,
                    'requiere_informacion' => false,
                    'motivo' => 'El establecimiento declaró expresamente no contar con estanterías altas ni mobiliario con riesgo de volteo (tiene_estanterias_altas = false).',
                ];
            }

            if ($tieneEstanteriasAltas === true) {
                return [
                    'codigo' => $codigo,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'activo' => true,
                    'aplicable' => true,
                    'estado_sugerido' => null,
                    'requiere_informacion' => false,
                    'motivo' => 'Aplica por declaración expresa de uso de estanterías, anaqueles o mobiliario alto con riesgo de volteo (tiene_estanterias_altas = true).',
                ];
            }

            return [
                'codigo' => $codigo,
                'criterio_id' => $criterio->id,
                'titulo' => $criterio->titulo,
                'tipo_criterio' => $criterio->tipo_criterio,
                'activo' => true,
                'aplicable' => null,
                'estado_sugerido' => null,
                'requiere_informacion' => true,
                'motivo' => 'Información sobre estanterías o mobiliario alto pendiente de declaración (tiene_estanterias_altas = null). NULL ≠ false y NULL ≠ NO_APLICA; sin regla de altura métrica arbitraria ni aplicabilidad universal automática.',
            ];
        }

        // 5. CRIT-05: Puesta a tierra con constancia documental ≤25 Ω (Tipo C)
        if ($codigo === 'CRIT-05') {
            return [
                'codigo' => $codigo,
                'criterio_id' => $criterio->id,
                'titulo' => $criterio->titulo,
                'tipo_criterio' => 'TIPO_C',
                'activo' => true,
                'aplicable' => true,
                'estado_sugerido' => null,
                'requiere_informacion' => false,
                'motivo' => 'Aplica universalmente a establecimientos con suministro eléctrico (Tipo C: declaración de constancia ≤25 Ω, sin medición física ni validación técnica por el sistema).',
            ];
        }

        // 6. Criterios universales activos (CRIT-01, CRIT-02B, CRIT-03, CRIT-04, CRIT-06, CRIT-07, CRIT-08, CRIT-14A)
        return [
            'codigo' => $codigo,
            'criterio_id' => $criterio->id,
            'titulo' => $criterio->titulo,
            'tipo_criterio' => $criterio->tipo_criterio,
            'activo' => true,
            'aplicable' => true,
            'estado_sugerido' => null,
            'requiere_informacion' => false,
            'motivo' => 'Criterio de aplicación universal para establecimientos comerciales.',
        ];
    }

    /**
     * Evalúa la aplicabilidad de los 13 criterios activos para una autoevaluación o contexto dado.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return Collection<string, array<string, mixed>>
     */
    public function evaluarAplicabilidad(Autoevaluacion|array $contexto): Collection
    {
        $criteriosActivos = $this->getCriteriosActivos();

        return $criteriosActivos->mapWithKeys(function (CriterioNormativo $criterio) use ($contexto) {
            return [$criterio->codigo_criterio => $this->evaluarCriterio($criterio, $contexto)];
        });
    }

    /**
     * Inicializa las respuestas de autoevaluación para los criterios activos evaluados.
     *
     * @return Collection<int, RespuestaAutoevaluacion>
     */
    public function inicializarRespuestas(Autoevaluacion $autoevaluacion): Collection
    {
        $evaluaciones = $this->evaluarAplicabilidad($autoevaluacion);
        $respuestas = collect();

        foreach ($evaluaciones as $eval) {
            if ($eval['aplicable'] === false && $eval['estado_sugerido'] === self::ESTADO_NO_APLICA) {
                $estadoInicial = self::ESTADO_NO_APLICA;
            } elseif ($eval['requiere_informacion'] === true) {
                $estadoInicial = self::ESTADO_POR_REVISAR;
            } else {
                $estadoInicial = self::ESTADO_PENDIENTE_ATENDER;
            }

            $respuesta = RespuestaAutoevaluacion::updateOrCreate(
                [
                    'autoevaluacion_id' => $autoevaluacion->id,
                    'criterio_id' => $eval['criterio_id'],
                ],
                [
                    'estado_respuesta' => $estadoInicial,
                    'notas_ciudadano' => ($estadoInicial === self::ESTADO_NO_APLICA || $estadoInicial === self::ESTADO_POR_REVISAR) ? $eval['motivo'] : null,
                ]
            );

            $respuestas->push($respuesta);
        }

        return $respuestas;
    }

    /**
     * Genera la estructura del checklist dinámico de autoevaluación clasificando
     * los 13 criterios activos en:
     * - criterios: evaluables con aplicable === true que deben ser mostrados al ciudadano.
     * - no_aplican: con aplicable === false, no se preguntan y quedan con estado NO_APLICA.
     * - informacion_pendiente: con aplicable === null (requiere_informacion = true).
     *
     * Los 6 criterios suspendidos quedan totalmente excluidos de las tres listas.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    public function generarChecklistDinamico(Autoevaluacion|array $contexto): array
    {
        $evaluaciones = $this->evaluarAplicabilidad($contexto);
        $criteriosActivos = $this->getCriteriosActivos()->keyBy('codigo_criterio');

        $criteriosEvaluables = [];
        $noAplican = [];
        $informacionPendiente = [];

        // Respuestas previas si el contexto es una Autoevaluación persistida
        $respuestasPrevias = collect();
        if ($contexto instanceof Autoevaluacion && $contexto->exists) {
            $respuestasPrevias = $contexto->respuestas()->get()->keyBy('criterio_id');
        }

        foreach ($evaluaciones as $codigo => $eval) {
            /** @var CriterioNormativo|null $criterio */
            $criterio = $criteriosActivos->get($codigo);
            if (! $criterio) {
                continue;
            }

            $respuestaPrevia = $respuestasPrevias->get($criterio->id);
            $estadoActual = $respuestaPrevia?->estado_respuesta;

            // Caso A: aplicable === true -> Mostrar criterio al ciudadano
            if ($eval['aplicable'] === true) {
                $criteriosEvaluables[] = [
                    'codigo' => $criterio->codigo_criterio,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'descripcion' => $criterio->que_observar ?? $criterio->titulo,
                    'categoria' => $criterio->categoria,
                    'pregunta_ciudadana' => $criterio->pregunta_ciudadana,
                    'que_observar' => $criterio->que_observar,
                    'accion_mejora_orientativa' => $criterio->accion_mejora_orientativa,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'norma_base' => $criterio->norma_base,
                    'articulo_referencia' => $criterio->articulo_referencia,
                    'orden' => $criterio->orden,
                    'aplicable' => true,
                    'requiere_informacion' => false,
                    'estado' => $estadoActual,
                    'notas' => $respuestaPrevia?->notas_ciudadano,
                    'opciones_respuesta' => self::RESPUESTAS_CIUDADANAS_PERMITIDAS,
                ];
            }
            // Caso B: aplicable === false -> No preguntar y registrar/representar NO_APLICA
            elseif ($eval['aplicable'] === false) {
                $noAplican[] = [
                    'codigo' => $criterio->codigo_criterio,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'categoria' => $criterio->categoria,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'norma_base' => $criterio->norma_base,
                    'articulo_referencia' => $criterio->articulo_referencia,
                    'orden' => $criterio->orden,
                    'aplicable' => false,
                    'requiere_informacion' => false,
                    'estado' => self::ESTADO_NO_APLICA,
                    'motivo' => $eval['motivo'],
                ];
            }
            // Caso C: aplicable === null -> Falta información física para determinar aplicabilidad
            else {
                $variableFaltante = match ($criterio->codigo_criterio) {
                    'CRIT-02A' => 'tiene_equipos_fritura',
                    'CRIT-03', 'CRIT-10' => 'usa_glp',
                    'CRIT-11' => 'tiene_escaleras',
                    'CRIT-13' => 'tiene_estanterias_altas',
                    default => null,
                };

                $informacionPendiente[] = [
                    'codigo' => $criterio->codigo_criterio,
                    'criterio_id' => $criterio->id,
                    'titulo' => $criterio->titulo,
                    'categoria' => $criterio->categoria,
                    'tipo_criterio' => $criterio->tipo_criterio,
                    'norma_base' => $criterio->norma_base,
                    'articulo_referencia' => $criterio->articulo_referencia,
                    'orden' => $criterio->orden,
                    'aplicable' => null,
                    'requiere_informacion' => true,
                    'variable_faltante' => $variableFaltante,
                    'mensaje' => $eval['motivo'],
                    'estado' => $estadoActual ?? null,
                    'motivo' => $eval['motivo'],
                ];
            }
        }

        $autoevaluacionId = $contexto instanceof Autoevaluacion ? $contexto->id : ($contexto['autoevaluacion_id'] ?? null);
        $uuid = $contexto instanceof Autoevaluacion ? $contexto->uuid_trazabilidad : ($contexto['uuid'] ?? null);

        return [
            'autoevaluacion_id' => $autoevaluacionId,
            'uuid' => $uuid,
            'criterios' => $criteriosEvaluables,
            'no_aplican' => $noAplican,
            'informacion_pendiente' => $informacionPendiente,
            'resumen' => [
                'total_criterios_catalogo' => 19,
                'total_catalogo' => 19,
                'total_activos' => 13,
                'total_suspendidos' => 6,
                'criterios_aplicables' => count($criteriosEvaluables),
                'total_evaluables' => count($criteriosEvaluables),
                'criterios_no_aplican' => count($noAplican),
                'total_no_aplican' => count($noAplican),
                'criterios_requieren_informacion' => count($informacionPendiente),
                'total_pendientes' => count($informacionPendiente),
            ],
        ];
    }

    /**
     * Construye el resumen descriptivo y orientativo de la autoevaluación,
     * organizando las declaraciones ciudadanas en colecciones canónicas
     * y calculando conteos absolutos sin generar porcentajes, semáforos ni puntuaciones.
     *
     * @return array<string, mixed>
     */
    public function generarResumenDescriptivo(Autoevaluacion $autoevaluacion): array
    {
        $checklist = $this->generarChecklistDinamico($autoevaluacion);

        $pendienteAtender = [];
        $porRevisar = [];
        $cumpleDeclarado = [];

        foreach ($checklist['criterios'] as $criterio) {
            $estado = $criterio['estado'] ?? null;

            if ($estado === self::ESTADO_PENDIENTE_ATENDER) {
                $pendienteAtender[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'pregunta_ciudadana' => $criterio['pregunta_ciudadana'] ?? null,
                    'que_observar' => $criterio['que_observar'] ?? $criterio['descripcion'],
                    'accion_mejora_orientativa' => $criterio['accion_mejora_orientativa'] ?? 'Revisar la condición técnica preventiva.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            } elseif ($estado === self::ESTADO_POR_REVISAR) {
                $porRevisar[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'que_observar' => $criterio['que_observar'] ?? $criterio['descripcion'],
                    'orientacion' => $criterio['accion_mejora_orientativa'] ?? 'Verificar las condiciones físicas o consultar con personal técnico competente.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            } elseif ($estado === self::ESTADO_CUMPLE_DECLARADO) {
                $cumpleDeclarado[] = [
                    'codigo' => $criterio['codigo'],
                    'titulo' => $criterio['titulo'],
                    'declaracion' => 'Declarado por el ciudadano como cumplido.',
                    'norma_base' => $criterio['norma_base'] ?? null,
                    'articulo_referencia' => $criterio['articulo_referencia'] ?? null,
                    'notas' => $criterio['notas'] ?? null,
                ];
            }
        }

        $noAplica = [];
        foreach ($checklist['no_aplican'] as $cna) {
            $noAplica[] = [
                'codigo' => $cna['codigo'],
                'titulo' => $cna['titulo'],
                'motivo' => $cna['motivo'] ?? 'Condición no aplicable según las características físicas declaradas del establecimiento.',
                'norma_base' => $cna['norma_base'] ?? null,
                'articulo_referencia' => $cna['articulo_referencia'] ?? null,
            ];
        }

        return [
            'conteos' => [
                'total_criterios_aplicables' => count($checklist['criterios']),
                'total_cumple_declarado' => count($cumpleDeclarado),
                'total_pendiente_atender' => count($pendienteAtender),
                'total_por_revisar' => count($porRevisar),
                'total_no_aplica' => count($noAplica),
            ],
            'pendiente_atender' => $pendienteAtender,
            'por_revisar' => $porRevisar,
            'cumple_declarado' => $cumpleDeclarado,
            'no_aplica' => $noAplica,
        ];
    }

    /**
     * Registra o actualiza la declaración de un ciudadano sobre un criterio evaluable.
     *
     * Reglas estrictas:
     * - NO_APLICA no es una opción seleccionable por el ciudadano (arroja excepción si se envía).
     * - Criterios suspendidos no aceptan respuestas.
     * - Criterios no aplicables al establecimiento no aceptan respuestas ciudadanas.
     *
     * @throws \InvalidArgumentException
     */
    public function registrarRespuestaCiudadana(
        Autoevaluacion $autoevaluacion,
        string $codigoCriterio,
        string $estado,
        ?string $notas = null
    ): RespuestaAutoevaluacion {
        // 1. Prohibición estricta de NO_APLICA por el ciudadano
        if ($estado === self::ESTADO_NO_APLICA) {
            throw new \InvalidArgumentException('El estado NO_APLICA es asignado exclusivamente por el sistema y no puede ser seleccionado por el ciudadano.');
        }

        // 2. Validación de estado canónico ciudadano permitido
        if (! $this->esRespuestaCiudadanaValida($estado)) {
            throw new \InvalidArgumentException("Estado de respuesta no autorizado para declaración ciudadana: {$estado}.");
        }

        // 3. Obtener el criterio normativo
        /** @var CriterioNormativo $criterio */
        $criterio = CriterioNormativo::where('codigo_criterio', $codigoCriterio)->firstOrFail();

        // 4. Verificar que no esté suspendido
        if (! $this->esCriterioEvaluable($criterio)) {
            throw new \InvalidArgumentException("El criterio [{$codigoCriterio}] está suspendido normativamente y no acepta respuestas.");
        }

        // 5. Evaluar aplicabilidad frente al contexto del establecimiento
        $eval = $this->evaluarCriterio($criterio, $autoevaluacion);
        if ($eval['aplicable'] === false) {
            throw new \InvalidArgumentException("El criterio [{$codigoCriterio}] no aplica a este establecimiento ({$eval['motivo']}) y no puede ser respondido por el ciudadano.");
        }

        return RespuestaAutoevaluacion::updateOrCreate(
            [
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $criterio->id,
            ],
            [
                'estado_respuesta' => $estado,
                'notas_ciudadano' => $notas,
            ]
        );
    }

    /**
     * Normaliza los parámetros de contexto utilizando los campos canónicos del Paso 1 y Paso 2:
     * - usa_glp (?bool)
     * - tiene_equipos_fritura (?bool)
     * - tiene_escaleras (?bool)
     * - tiene_estanterias_altas (?bool)
     * Respetando rigurosamente que NULL ≠ false ≠ NO_APLICA.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    private function normalizarContexto(Autoevaluacion|array $contexto): array
    {
        if ($contexto instanceof Autoevaluacion) {
            return [
                'area_m2' => $contexto->area_m2,
                'pisos' => $contexto->pisos,
                'aforo' => $contexto->aforo,
                'usa_glp' => $contexto->usa_glp,
                'usa_caldero' => $contexto->usa_caldero,
                'usa_liquidos_inflamables' => $contexto->usa_liquidos_inflamables,
                'tiene_equipos_fritura' => $contexto->tiene_equipos_fritura,
                'tiene_escaleras' => $contexto->tiene_escaleras,
                'tiene_estanterias_altas' => $contexto->tiene_estanterias_altas,
            ];
        }

        return [
            'area_m2' => isset($contexto['area_m2']) && $contexto['area_m2'] !== null ? (float) $contexto['area_m2'] : null,
            'pisos' => isset($contexto['pisos']) && $contexto['pisos'] !== null ? (int) $contexto['pisos'] : null,
            'aforo' => isset($contexto['aforo']) && $contexto['aforo'] !== null ? (int) $contexto['aforo'] : null,
            'usa_glp' => $this->extraerBooleanoNullable($contexto, 'usa_glp'),
            'usa_caldero' => $this->extraerBooleanoNullable($contexto, 'usa_caldero'),
            'usa_liquidos_inflamables' => $this->extraerBooleanoNullable($contexto, 'usa_liquidos_inflamables'),
            'tiene_equipos_fritura' => $this->extraerBooleanoNullable($contexto, 'tiene_equipos_fritura'),
            'tiene_escaleras' => $this->extraerBooleanoNullable($contexto, 'tiene_escaleras'),
            'tiene_estanterias_altas' => $this->extraerBooleanoNullable($contexto, 'tiene_estanterias_altas'),
        ];
    }

    /**
     * Extrae de forma segura un valor booleano o null desde un array de contexto,
     * examinando tanto la raíz como la clave interna 'caracteristicas_declaradas'.
     *
     * @param  array<string, mixed>  $contexto
     */
    private function extraerBooleanoNullable(array $contexto, string $clave): ?bool
    {
        if (array_key_exists($clave, $contexto)) {
            $val = $contexto[$clave];

            return $val !== null ? (bool) $val : null;
        }

        if (isset($contexto['caracteristicas_declaradas']) && is_array($contexto['caracteristicas_declaradas']) && array_key_exists($clave, $contexto['caracteristicas_declaradas'])) {
            $val = $contexto['caracteristicas_declaradas'][$clave];

            return $val !== null ? (bool) $val : null;
        }

        return null;
    }

    /**
     * Construye el contenido canónico estructurado y determinístico de una autoevaluación.
     * Excluye expresamente user_id, tokens de sesión y timestamps volátiles.
     *
     * @return array<string, mixed>
     */
    public function generarPayloadCanonico(Autoevaluacion $autoevaluacion): array
    {
        // Si la autoevaluación ya está registrada y posee snapshot histórico persistido,
        // este snapshot es la única fuente de verdad inmutable para el payload canónico.
        if ($autoevaluacion->estaRegistrada() && ! empty($autoevaluacion->payload_canonico)) {
            $snapshot = is_array($autoevaluacion->payload_canonico)
                ? $autoevaluacion->payload_canonico
                : (array) json_decode((string) $autoevaluacion->payload_canonico, true);

            $this->normalizarArrayDeterminista($snapshot);

            return $snapshot;
        }

        $evaluaciones = $this->evaluarAplicabilidad($autoevaluacion);
        $criteriosActivos = $this->getCriteriosActivos()->keyBy('codigo_criterio');
        $respuestasGuardadas = $autoevaluacion->respuestas()->get()->keyBy('criterio_id');

        $criteriosList = [];

        foreach ($evaluaciones as $codigo => $eval) {
            $criterio = $criteriosActivos->get($codigo);
            if (! $criterio) {
                continue;
            }

            $respuesta = $respuestasGuardadas->get($criterio->id);

            if ($eval['aplicable'] === true) {
                $criteriosList[] = [
                    'codigo' => $codigo,
                    'aplicabilidad' => 'APLICA',
                    'estado_declarado' => $respuesta?->estado_respuesta ?? 'SIN_RESPUESTA',
                    'notas' => filled($respuesta?->notas_ciudadano) ? trim((string) $respuesta->notas_ciudadano) : null,
                ];
            } elseif ($eval['aplicable'] === false) {
                $criteriosList[] = [
                    'codigo' => $codigo,
                    'aplicabilidad' => 'NO_APLICA',
                    'estado_declarado' => self::ESTADO_NO_APLICA,
                    'notas' => null,
                ];
            } else {
                $criteriosList[] = [
                    'codigo' => $codigo,
                    'aplicabilidad' => 'REQUIERE_INFORMACION',
                    'estado_declarado' => 'SIN_INFORMACION',
                    'notas' => null,
                ];
            }
        }

        // Ordenamiento estricto de criterios por código alfabético
        usort($criteriosList, fn ($a, $b) => strcmp($a['codigo'], $b['codigo']));

        $payload = [
            'establecimiento' => [
                'nombre_comercio' => trim((string) $autoevaluacion->nombre_comercio),
                'ruc' => filled($autoevaluacion->ruc) ? trim((string) $autoevaluacion->ruc) : null,
                'funcion_economica' => trim((string) $autoevaluacion->funcion_economica),
                'direccion' => filled($autoevaluacion->direccion) ? trim((string) $autoevaluacion->direccion) : null,
                'referencia' => filled($autoevaluacion->referencia) ? trim((string) $autoevaluacion->referencia) : null,
            ],
            'caracteristicas' => [
                'aforo' => $autoevaluacion->aforo !== null ? (int) $autoevaluacion->aforo : null,
                'area_m2' => $autoevaluacion->area_m2 !== null ? round((float) $autoevaluacion->area_m2, 2) : null,
                'galones_glp' => $autoevaluacion->galones_glp !== null ? round((float) $autoevaluacion->galones_glp, 2) : null,
                'pisos' => $autoevaluacion->pisos !== null ? (int) $autoevaluacion->pisos : null,
                'tiene_equipos_fritura' => $autoevaluacion->tiene_equipos_fritura !== null ? (bool) $autoevaluacion->tiene_equipos_fritura : null,
                'tiene_escaleras' => $autoevaluacion->tiene_escaleras !== null ? (bool) $autoevaluacion->tiene_escaleras : null,
                'tiene_estanterias_altas' => $autoevaluacion->tiene_estanterias_altas !== null ? (bool) $autoevaluacion->tiene_estanterias_altas : null,
                'usa_caldero' => $autoevaluacion->usa_caldero !== null ? (bool) $autoevaluacion->usa_caldero : null,
                'usa_glp' => $autoevaluacion->usa_glp !== null ? (bool) $autoevaluacion->usa_glp : null,
                'usa_liquidos_inflamables' => $autoevaluacion->usa_liquidos_inflamables !== null ? (bool) $autoevaluacion->usa_liquidos_inflamables : null,
            ],
            'criterios' => $criteriosList,
        ];

        $this->normalizarArrayDeterminista($payload);

        return $payload;
    }

    /**
     * Serializa de forma canónica y determinística el payload de la autoevaluación.
     */
    public function generarJsonCanonico(Autoevaluacion $autoevaluacion): string
    {
        $payload = $this->generarPayloadCanonico($autoevaluacion);
        $this->normalizarArrayDeterminista($payload);

        return (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /**
     * Calcula la huella criptográfica SHA-256 canónica de la autoevaluación registrada.
     */
    public function calcularHashIntegridad(Autoevaluacion $autoevaluacion): string
    {
        $jsonCanonico = $this->generarJsonCanonico($autoevaluacion);

        return hash('sha256', $jsonCanonico);
    }

    /**
     * Normaliza recursivamente las claves de arrays asociativos en orden alfabético estricto.
     */
    public function normalizarArrayDeterminista(array &$data): void
    {
        if (! array_is_list($data)) {
            ksort($data);
        }

        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->normalizarArrayDeterminista($value);
            }
        }
    }
}
