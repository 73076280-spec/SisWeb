<?php

namespace App\Services;

use App\Models\RecursoEducativo;

class ItseRiskService
{
    /**
     * Catálogo base de costos referenciales de subsanación técnica en Huancayo (Soles).
     * Sustento: USM (2026) - Priorización Operativa y Económica.
     */
    public const COSTOS_REFERENCIALES = [
        'EXTINTOR' => [
            'nombre' => 'Recarga y certificación anual de extintor PQS 6kg con soporte',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 65.00,
            'norma' => 'NTP 350.043-1 / RNE A.130',
        ],
        'EXTINTOR_PQS' => [
            'nombre' => 'Recarga y mantenimiento anual del extintor PQS (carga vigente, tarjeta y manómetro)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 65.00,
            'norma' => 'NTP 350.043-1 / RNE A.130 Art. 163',
        ],
        'DETECTORES_HUMO' => [
            'nombre' => 'Instalación de detectores de humo fotoeléctricos autónomos o centralizados',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 90.00,
            'norma' => 'RNE A.130 Art. 53 / NFPA 72',
        ],
        'CAMPANA_EXTRACCION' => [
            'nombre' => 'Mantenimiento y desengrase de campana extractora y filtros metálicos',
            'prioridad' => 'Media',
            'dias_plazo' => 5,
            'costo_soles' => 150.00,
            'norma' => 'RNE Norma EM.030',
        ],
        'DIFERENCIAL' => [
            'nombre' => 'Suministro e instalación de interruptor diferencial de 30mA (2x25A / 2x40A)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 110.00,
            'norma' => 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
        ],
        'CABLEADO_CANALIZADO' => [
            'nombre' => 'Canalización de cables expuestos en tuberías o canaletas libres de empalmes',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 80.00,
            'norma' => 'CNE-U Regla 070.212',
        ],
        'PUERTAS_ESCAPE' => [
            'nombre' => 'Adecuación de puertas de salida con apertura hacia afuera y sin cerrojos trabados',
            'prioridad' => 'Alta',
            'dias_plazo' => 3,
            'costo_soles' => 120.00,
            'norma' => 'RNE A.010 Art. 26',
        ],
        'AFORO_CARTEL' => [
            'nombre' => 'Elaboración y colocación de cartel de aforo máximo permitido en el acceso',
            'prioridad' => 'Baja',
            'dias_plazo' => 5,
            'costo_soles' => 25.00,
            'norma' => 'RNE A.010 Art. 20',
        ],
        'ANCLAJE_ESTANTERIAS' => [
            'nombre' => 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
            'prioridad' => 'Media',
            'dias_plazo' => 4,
            'costo_soles' => 100.00,
            'norma' => 'RNE E.030 Sismorresistente',
        ],
        'LAMINADO_VIDRIOS' => [
            'nombre' => 'Instalación de lámina de seguridad de 4 micras o vidrio templado en lunas crudas',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 90.00,
            'norma' => 'RNE Norma E.040 Vidrio',
        ],
        'EXTINTOR_K' => [
            'nombre' => 'Instalación de extintor Acetato de Potasio Tipo K para cocinas',
            'prioridad' => 'Alta',
            'dias_plazo' => 3,
            'costo_soles' => 280.00,
            'norma' => 'NTP 350.043-1',
        ],
        'TERMOMAGNETICO' => [
            'nombre' => 'Suministro e instalación de interruptor diferencial de 30mA (2x25A / 2x40A)',
            'prioridad' => 'Alta',
            'dias_plazo' => 2,
            'costo_soles' => 110.00,
            'norma' => 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
        ],
        'TABLERO_MANDIL' => [
            'nombre' => 'Colocación de mandil de protección y tapas ciegas en tablero eléctrico',
            'prioridad' => 'Media',
            'dias_plazo' => 3,
            'costo_soles' => 45.00,
            'norma' => 'CNE-U Regla 020.132',
        ],
        'POZO_TIERRA' => [
            'nombre' => 'Mantenimiento y protocolo de medición de pozo a tierra (<= 25 Ohmios)',
            'prioridad' => 'Media',
            'dias_plazo' => 5,
            'costo_soles' => 180.00,
            'norma' => 'CNE-U Regla 060.712',
        ],
        'EVACUACION' => [
            'nombre' => 'Despeje y adecuación de ancho mínimo de vías de evacuación (>= 0.90m - 1.20m)',
            'prioridad' => 'Alta',
            'dias_plazo' => 1,
            'costo_soles' => 0.00,
            'norma' => 'RNE Norma A.010 Art. 25 y A.130',
        ],
        'LUCES_EMERG' => [
            'nombre' => 'Instalación de luz de emergencia autónoma LED con batería de 90 min',
            'prioridad' => 'Media',
            'dias_plazo' => 4,
            'costo_soles' => 75.00,
            'norma' => 'RNE Norma A.130 Art. 39',
        ],
        'SENALETICA' => [
            'nombre' => 'Kit de señales de seguridad fotoluminiscentes (Salida, Extintor, Riesgo Eléctrico)',
            'prioridad' => 'Baja',
            'dias_plazo' => 10,
            'costo_soles' => 55.00,
            'norma' => 'NTP 399.010-1',
        ],
        'BOTIQUIN' => [
            'nombre' => 'Implementación de botiquín de primeros auxilios reglamentario adosado a pared',
            'prioridad' => 'Baja',
            'dias_plazo' => 10,
            'costo_soles' => 60.00,
            'norma' => 'Directiva INDECI / CENEPRED',
        ],
    ];

    /**
     * Catálogo técnico normativo de condiciones de seguridad ITSE.
     * Criterios de autoevaluación basados en normativa peruana de referencia
     * (RNE A.010/A.130, NTP, CNE-U, R.M. 175-2008-MEM). Debe mantenerse en
     * sincronía con el checklist que presenta resources/js/pages/Evaluacion/Index.tsx.
     * Requerido por EvaluacionController@index para pintar el formulario.
     */
    public function getCatalogoChecklist(): array
    {
        $items = [
            [
                'codigo' => 'EXTINTOR_PQS',
                'nombre' => 'Extintor PQS con carga vigente, tarjeta de mantenimiento y manómetro operativo',
                'es_critico' => true,
                'norma' => 'NTP 350.043-1 / RNE A.130 Art. 163',
            ],
            [
                'codigo' => 'EXTINTOR_K',
                'nombre' => 'Extintor de Acetato de Potasio (Tipo K) en cocinas comerciales o freidoras',
                'es_critico' => true,
                'norma' => 'NTP 350.043-1 Art. 7.2',
            ],
            [
                'codigo' => 'DETECTORES_HUMO',
                'nombre' => 'Detectores de humo fotoeléctricos autónomos o centralizados operativos',
                'es_critico' => false,
                'norma' => 'RNE Norma A.130 Art. 53 / NFPA 72',
            ],
            [
                'codigo' => 'CAMPANA_EXTRACCION',
                'nombre' => 'Campana extractora con filtros metálicos limpios y ducto incombustible',
                'es_critico' => false,
                'norma' => 'RNE Norma EM.030',
            ],
            [
                'codigo' => 'DIFERENCIAL',
                'nombre' => 'Interruptores diferenciales de 30mA en circuitos eléctricos',
                'es_critico' => true,
                'norma' => 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
            ],
            [
                'codigo' => 'TERMOMAGNETICO',
                'nombre' => 'Interruptores termomagnéticos calibrados a la sección del cable (sin puentes)',
                'es_critico' => true,
                'norma' => 'CNE-U Regla 150-400',
            ],
            [
                'codigo' => 'TABLERO_MANDIL',
                'nombre' => 'Tablero eléctrico con mandil protector (resina o metálico) y sin cables expuestos',
                'es_critico' => false,
                'norma' => 'CNE-U Regla 020.132 / Regla 070.212',
            ],
            [
                'codigo' => 'POZO_TIERRA',
                'nombre' => 'Sistema de puesta a tierra con protocolo de medición vigente (<= 25 Ohmios)',
                'es_critico' => true,
                'norma' => 'CNE-U Regla 060.712 / R.J. 016-2018 Anexo 4',
            ],
            [
                'codigo' => 'CABLEADO_CANALIZADO',
                'nombre' => 'Cables eléctricos canalizados en tuberías o canaletas libres de empalmes expuestos',
                'es_critico' => false,
                'norma' => 'CNE-U Regla 070.212',
            ],
            [
                'codigo' => 'EVACUACION',
                'nombre' => 'Rutas y salidas de escape 100% despejadas (ancho útil mín. 0.90 m - 1.20 m)',
                'es_critico' => true,
                'norma' => 'RNE Norma A.010 Art. 25 y A.130 Art. 13',
            ],
            [
                'codigo' => 'PUERTAS_ESCAPE',
                'nombre' => 'Puertas de salida de fácil apertura sin cerrojos trabados en horario de atención',
                'es_critico' => true,
                'norma' => 'RNE Norma A.010 Art. 26',
            ],
            [
                'codigo' => 'LUCES_EMERG',
                'nombre' => 'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)',
                'es_critico' => false,
                'norma' => 'RNE Norma A.130 Art. 39 / NTP IEC 60598-2-22',
            ],
            [
                'codigo' => 'SENALETICA',
                'nombre' => 'Señales fotoluminiscentes de seguridad reglamentarias (Salida, Extintor, Sismo)',
                'es_critico' => false,
                'norma' => 'NTP 399.010-1',
            ],
            [
                'codigo' => 'AFORO_CARTEL',
                'nombre' => 'Cartel de aforo máximo permitido visible en el acceso principal',
                'es_critico' => false,
                'norma' => 'RNE Norma A.010 Art. 20',
            ],
            [
                'codigo' => 'BOTIQUIN',
                'nombre' => 'Botiquín de primeros auxilios abastecido y adosado en pared visible',
                'es_critico' => false,
                'norma' => 'Directiva INDECI / CENEPRED',
            ],
            [
                'codigo' => 'ANCLAJE_ESTANTERIAS',
                'nombre' => 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
                'es_critico' => false,
                'norma' => 'RNE E.030 Sismorresistente',
            ],
            [
                'codigo' => 'LAMINADO_VIDRIOS',
                'nombre' => 'Vidrios crudos protegidos con láminas de seguridad de 4 micras o templados',
                'es_critico' => false,
                'norma' => 'RNE Norma E.040 Vidrio',
            ],
        ];

        // Recursos educativos activos (micro-learning) indexados por código normativo.
        // En entornos sin base de datos (tests unitarios puros) se degrada a un catálogo vacío.
        try {
            $recursos = RecursoEducativo::query()
                ->activos()
                ->get()
                ->keyBy('codigo_normativo');
        } catch (\Throwable) {
            $recursos = collect();
        }

        return array_map(function (array $item) use ($recursos): array {
            $recurso = $recursos->get($item['codigo']);

            return $item + [
                'video_url' => $recurso?->url,
                'tipo' => $recurso?->tipo,
                'base_legal' => $recurso?->base_legal,
                'evidencia_sugerida' => $recurso?->evidencia_sugerida,
            ];
        }, $items);
    }

    /**
     * Motor 1: Clasificación de Trámite según R.J. 016-2018-CENEPRED/J y RNE G.040.
     * Criterio: Comercio <= 3 pisos y <= 750m2 => EX_POST. Superar límites o factores agravantes => EX_ANTE.
     */
    public function clasificarTramite(
        string $funcion = 'Comercio',
        float $areaM2 = 0.0,
        int $pisos = 1,
        int $aforo = 10,
        bool $usaGlp = false,
        float $galonesGlp = 0.0,
        bool $usaCaldero = false,
        bool $usaLiquidosInflamables = false
    ): array {
        $esPrevia = false;
        $motivos = [];

        // 1. Escala Física por Función Comercial (R.J. 016-2018-CENEPRED/J Numeral 1.1.2)
        if ($funcion === 'Comercio') {
            if ($pisos > 3) {
                $esPrevia = true;
                $motivos[] = "Supera los 3 pisos de altura ({$pisos} pisos registrados).";
            }
            if ($areaM2 > 750.0) {
                $esPrevia = true;
                $motivos[] = "Supera los 750 m² de área techada ({$areaM2} m² registrados).";
            }
        } elseif (in_array($funcion, ['Salud', 'Educacion', 'Hospedaje', 'Industrial', 'Encuentro'])) {
            if ($areaM2 > 500.0 || $pisos > 2 || $aforo > 100) {
                $esPrevia = true;
                $motivos[] = "La función '{$funcion}' clasifica en Riesgo Alto por su escala/aforo.";
            }
        }

        // 2. Factores Agravantes de Carga Térmica (R.J. 016-2018 Cap. I Num. 1.1.2 lit. i / D.S. 027-94-EM)
        if ($usaCaldero) {
            $esPrevia = true;
            $motivos[] = 'Presencia de caldero en el establecimiento.';
        }

        if ($usaGlp && $galonesGlp > 118.18) { // > 0.45 m3
            $esPrevia = true;
            $motivos[] = 'Almacenamiento de GLP superior a 118.18 galones (0.45 m³).';
        } elseif ($usaGlp && $galonesGlp <= 0) {
            // Compatibilidad hacia atrás si solo marcaron usa_glp = true
            $esPrevia = true;
            $motivos[] = 'Uso de GLP comercial reportado.';
        }

        if ($usaLiquidosInflamables) {
            $esPrevia = true;
            $motivos[] = 'Almacenamiento o manipulación de líquidos combustibles o reactivos inflamables.';
        }

        return [
            'tipo_tramite' => $esPrevia ? 'EX_ANTE' : 'EX_POST',
            'nivel_riesgo' => $esPrevia ? 'ALTO_MUY_ALTO' : 'BAJO_MEDIO',
            'es_bloqueante' => $esPrevia,
            'motivos' => $motivos,
        ];
    }

    /**
     * Motor 2: Semáforo Cívico CENEPRED (Verde >= 85%, Ámbar 60-84%, Rojo < 60% o Falla Crítica).
     * Estados declarados por el ciudadano: CUMPLE, NO_CUMPLE, NA o POR_REVISAR (pendiente de revisión).
     */
    public function calcularConformidad(array $checklist): array
    {
        $evaluables = array_filter($checklist, function ($item) {
            $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');

            return $estado !== 'NA';
        });

        $totalEvaluables = count($evaluables);

        if ($totalEvaluables === 0) {
            return [
                'porcentaje' => 100.0,
                'semaforo' => 'VERDE',
                'tiene_falla_critica' => false,
                'total_evaluables' => 0,
                'total_cumple' => 0,
                'total_por_revisar' => 0,
            ];
        }

        $cumplidos = 0;
        $porRevisar = 0;
        $tieneFallaCritica = false;

        foreach ($evaluables as $item) {
            $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
            $esCritico = $item['es_critico'] ?? false;

            if ($estado === 'CUMPLE') {
                $cumplidos++;
            } elseif ($estado === 'POR_REVISAR') {
                $porRevisar++;
            } elseif ($esCritico) {
                $tieneFallaCritica = true;
            }
        }

        $porcentaje = round(($cumplidos / $totalEvaluables) * 100, 1);

        if ($tieneFallaCritica || $porcentaje < 60.0) {
            $semaforo = 'ROJO';
        } elseif ($porcentaje >= 85.0) {
            $semaforo = 'VERDE';
        } else {
            $semaforo = 'AMBAR';
        }

        return [
            'porcentaje' => $porcentaje,
            'semaforo' => $semaforo,
            'tiene_falla_critica' => $tieneFallaCritica,
            'total_evaluables' => $totalEvaluables,
            'total_cumple' => $cumplidos,
            'total_por_revisar' => $porRevisar,
        ];
    }

    /**
     * Motor 3: Generación del Plan de Acción Priorizado con Costos en Soles.
     * Sustento: USM (2026).
     */
    public function generarPlanDeAccion(array $checklist): array
    {
        $tareas = [];
        $costoTotal = 0.0;

        foreach ($checklist as $item) {
            $estado = $item['estado'] ?? ($item['cumple'] ? 'CUMPLE' : 'NO_CUMPLE');
            if ($estado === 'NO_CUMPLE') {
                $codigo = $item['codigo'] ?? '';
                $catalogo = self::COSTOS_REFERENCIALES[$codigo] ?? [
                    'nombre' => $item['nombre'] ?? 'Subsanación técnica requerida',
                    'prioridad' => ($item['es_critico'] ?? false) ? 'Alta' : 'Media',
                    'dias_plazo' => ($item['es_critico'] ?? false) ? 2 : 5,
                    'costo_soles' => 50.00,
                    'norma' => 'R.J. 016-2018-CENEPRED/J',
                ];

                $tareas[] = [
                    'codigo' => $codigo,
                    'item' => $item['nombre'] ?? '',
                    'tarea' => $catalogo['nombre'],
                    'prioridad' => $catalogo['prioridad'],
                    'dias_plazo' => $catalogo['dias_plazo'],
                    'costo_soles' => $catalogo['costo_soles'],
                    'norma' => $catalogo['norma'],
                ];

                $costoTotal += $catalogo['costo_soles'];
            }
        }

        $orden = ['Alta' => 1, 'Media' => 2, 'Baja' => 3];
        usort($tareas, fn ($a, $b) => ($orden[$a['prioridad']] ?? 9) <=> ($orden[$b['prioridad']] ?? 9));

        return [
            'tareas' => $tareas,
            'costo_total' => $costoTotal,
            'total_items' => count($tareas),
        ];
    }

    /**
     * Motor 4: Métrica de Asimetría Informativa (Gap Analysis).
     * Sustento: PUCP - Metodología de diagnóstico de fallas.
     */
    public function calcularMetricaGap(float $porcentajeDeclarado, float $porcentajeVerificado): float
    {
        return round($porcentajeDeclarado - $porcentajeVerificado, 1);
    }
}
