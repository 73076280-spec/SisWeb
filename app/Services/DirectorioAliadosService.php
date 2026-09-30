<?php

namespace App\Services;

/**
 * Directorio referencial y tipado de especialistas y empresas de seguridad
 * del Valle del Mantaro (Huancayo, El Tambo, Chilca).
 *
 * Los registros son datos comunitarios orientativos para que el ciudadano
 * encuentre apoyo cercano; no constituyen recomendación oficial, certificación
 * ni relación con la inspección ITSE. Categorías técnicas:
 *
 * - electricas: electricistas colegiados, protocolos de pozo a tierra, tableros y diferenciales.
 * - incendios: recarga y venta de extintores PQS y Clase K, detectores de humo.
 * - arquitectura_senaletica: luces de emergencia, señalética Celtex (NTP 399.010-1), cintas antideslizantes.
 * - estructuras: anclaje sismorresistente de estanterías y peritaje básico.
 *
 * La fuente canónica de costos por criterio es ItseRiskService::COSTOS_REFERENCIALES;
 * este servicio sólo deriva el rango de referencia alrededor de ese valor.
 */
class DirectorioAliadosService
{
    /**
     * Claves de especialidad soportadas por el directorio.
     */
    public const CATEGORIAS = [
        'electricas',
        'incendios',
        'arquitectura_senaletica',
        'estructuras',
    ];

    /**
     * @phpstan-type Aliado array{
     *     id: string,
     *     categoria: string,
     *     nombre_comercial: string,
     *     contacto_nombre: string,
     *     especialidad_texto: string,
     *     telefono: string,
     *     whatsapp: string,
     *     sede: string,
     *     cobertura: string,
     *     verificado: bool,
     *     servicios: array<int, string>
     * }
     */
    private const ALIADOS = [
        [
            'id' => 'ELEC-001',
            'categoria' => 'electricas',
            'nombre_comercial' => 'Ingeniería Eléctrica Mantaro S.A.C.',
            'contacto_nombre' => 'Ing. Elmer Ccahuana Rojas',
            'especialidad_texto' => 'Especialista Eléctrico Colegiado',
            'telefono' => '51976541230',
            'whatsapp' => '51976541230',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo Metropolitano',
            'verificado' => true,
            'servicios' => [
                'Medición de protocolo de pozo a tierra con informe de resistividad',
                'Suministro e instalación de tableros de distribución con mandil protector',
                'Diferenciales 30mA y termomagnéticos calibrados a la sección del cable',
                'Pruebas de aislamiento y certificación de instalaciones según CNE-U',
            ],
        ],
        [
            'id' => 'ELEC-002',
            'categoria' => 'electricas',
            'nombre_comercial' => 'Servicios Técnicos El Tambo E.I.R.L.',
            'contacto_nombre' => 'Sr. Wilder Ñaupa Mamani',
            'especialidad_texto' => 'Electricista Certificado en Instalaciones Eléctricas',
            'telefono' => '51942318745',
            'whatsapp' => '51942318745',
            'sede' => 'El Tambo',
            'cobertura' => 'Huancayo / El Tambo',
            'verificado' => true,
            'servicios' => [
                'Canalización de cables en canaletas y tuberías con prueba de operación',
                'Adecuación de tableros sin conductores expuestos',
                'Mantenimiento preventivo de redes interiores',
                'Suministro de tomacorrientes y luminarias de seguridad',
            ],
        ],
        [
            'id' => 'ELEC-003',
            'categoria' => 'electricas',
            'nombre_comercial' => 'Ferretería El Tambino E.I.R.L.',
            'contacto_nombre' => 'Sr. Rómulo Berrios Ayala',
            'especialidad_texto' => 'Suministro y Montaje Eléctrico',
            'telefono' => '51934129077',
            'whatsapp' => '51934129077',
            'sede' => 'El Tambo',
            'cobertura' => 'Huancayo / El Tambo / Chilca',
            'verificado' => true,
            'servicios' => [
                'Venta de diferenciales 30mA y llaves termomagnéticas',
                'Venta de tableros, canaletas y accesorios de instalación',
                'Asesoría en lectura de planos eléctricos',
            ],
        ],
        [
            'id' => 'INC-001',
            'categoria' => 'incendios',
            'nombre_comercial' => 'Extintores Centro del Mantaro S.A.C.',
            'contacto_nombre' => 'Ing. Percy Chanchamayo Ríos',
            'especialidad_texto' => 'Empresa Certificada en Recarga de Extintores',
            'telefono' => '51947520110',
            'whatsapp' => '51947520110',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo Metropolitano',
            'verificado' => true,
            'servicios' => [
                'Recarga y certificación anual de extintores PQS con tarjeta de mantenimiento',
                'Venta y distribución de extintores de polvo químico seco',
                'Suministro e instalación de extintores Tipo K para cocinas comerciales',
                'Revisión y reposición de manómetros y sellos de seguridad',
            ],
        ],
        [
            'id' => 'INC-002',
            'categoria' => 'incendios',
            'nombre_comercial' => 'Protección Contra Incendios Apu E.I.R.L.',
            'contacto_nombre' => 'Ing. Luis Alberto Cervantes Peña',
            'especialidad_texto' => 'Especialista en Detección y Supresión de Incendios',
            'telefono' => '51958406233',
            'whatsapp' => '51958406233',
            'sede' => 'Chilca',
            'cobertura' => 'Huancayo / Chilca',
            'verificado' => true,
            'servicios' => [
                'Instalación de detectores de humo fotoeléctricos autónomos y centralizados',
                'Recarga y mantenimiento de extintores PQS de 6 kg y 9 kg',
                'Dimensionamiento y ubicación de extintores según área de riesgo',
                'Pruebas funcionales periódicas de la red de detección',
            ],
        ],
        [
            'id' => 'INC-003',
            'categoria' => 'incendios',
            'nombre_comercial' => 'Incendios & Seguridad Valle S.A.C.',
            'contacto_nombre' => 'Sr. Marcial Ttito Condori',
            'especialidad_texto' => 'Técnico Certificado en Recarga y Mantenimiento',
            'telefono' => '51933907456',
            'whatsapp' => '51933907456',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo Metropolitano',
            'verificado' => true,
            'servicios' => [
                'Recarga de extintores PQS con servicio a domicilio',
                'Suministro de extintores Clase K para freidoras y cocinas',
                'Venta de detectores de humo y luminarias de emergencia',
                'Limpieza y desengrase de campanas extractoras y filtros metálicos',
            ],
        ],
        [
            'id' => 'ARQ-001',
            'categoria' => 'arquitectura_senaletica',
            'nombre_comercial' => 'Señalética Andina E.I.R.L.',
            'contacto_nombre' => 'Sr. Andrés Palomino Soria',
            'especialidad_texto' => 'Proveedor de Señalética de Seguridad Celtex',
            'telefono' => '51973560944',
            'whatsapp' => '51973560944',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo Metropolitano',
            'verificado' => true,
            'servicios' => [
                'Señalética Celtex fotoluminiscente según NTP 399.010-1',
                'Kit de señales de Salida, Extintor y Riesgo Eléctrico',
                'Marcación de rutas de evacuación y puntos de reunión',
                'Carteles de aforo máximo permitido y señalización de almacén',
            ],
        ],
        [
            'id' => 'ARQ-002',
            'categoria' => 'arquitectura_senaletica',
            'nombre_comercial' => 'Iluminación de Emergencia Sacs IHS.A.C.',
            'contacto_nombre' => 'Ing. Joseth Ramos Huamán',
            'especialidad_texto' => 'Especialista en Iluminación de Emergencia',
            'telefono' => '51988745206',
            'whatsapp' => '51988745206',
            'sede' => 'El Tambo',
            'cobertura' => 'Huancayo / El Tambo',
            'verificado' => true,
            'servicios' => [
                'Suministro e instalación de luminarias de emergencia LED autónomas de 90 minutos',
                'Pruebas de autonomía de batería y cambio de baterías',
                'Luces de emergencia sobre puertas de salida y rutas de evacuación',
                'Mantenimiento programado y etiquetado de equipos',
            ],
        ],
        [
            'id' => 'ARQ-003',
            'categoria' => 'arquitectura_senaletica',
            'nombre_comercial' => 'Pisos Seguros Mantaro E.I.R.L.',
            'contacto_nombre' => 'Sr. Percy Salcedo Quispe',
            'especialidad_texto' => 'Aplicación de Cintas Antideslizantes y Señalización',
            'telefono' => '51902763918',
            'whatsapp' => '51902763918',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo / Chilca',
            'verificado' => true,
            'servicios' => [
                'Aplicación de cintas antideslizantes en escaleras, rampas y pasillos',
                'Señalización fotoluminiscente de zócalos y nivelaciones',
                'Señalética de tránsito interno y demarcación de zonas',
                'Asesoría en cumplimiento de rutas de evacuación peatonales',
            ],
        ],
        [
            'id' => 'EST-001',
            'categoria' => 'estructuras',
            'nombre_comercial' => 'Anclajes y Estructuras Huancayo E.I.R.L.',
            'contacto_nombre' => 'Ing. Víctor Hugo Ticona Mamani',
            'especialidad_texto' => 'Especialista en Anclaje Sismorresistente',
            'telefono' => '51981264530',
            'whatsapp' => '51981264530',
            'sede' => 'Huancayo',
            'cobertura' => 'Huancayo Metropolitano',
            'verificado' => true,
            'servicios' => [
                'Anclaje sismorresistente a muro y piso de estanterías mayores a 1.80 m',
                'Refuerzo de anaqueles y racks metálicos',
                'Verificación de anclajes existentes con peritaje básico',
                'Emisión de informe de conformidad estructural referencial',
            ],
        ],
        [
            'id' => 'EST-002',
            'categoria' => 'estructuras',
            'nombre_comercial' => 'Peritajes Técnicos Valle Verde S.A.C.',
            'contacto_nombre' => 'Ing. Miriam Condori Apaza',
            'especialidad_texto' => 'Perito Registrado en Seguridad de Edificaciones',
            'telefono' => '51950471892',
            'whatsapp' => '51950471892',
            'sede' => 'Chilca',
            'cobertura' => 'Huancayo / Chilca',
            'verificado' => true,
            'servicios' => [
                'Peritaje básico de elementos estructurales y cubiertas',
                'Evaluación de riesgos de colapso en muros de tabiquería',
                'Instalación de lámina de seguridad en vidrios crudos',
                'Informe técnico de peritaje para el expediente ITSE',
            ],
        ],
        [
            'id' => 'EST-003',
            'categoria' => 'estructuras',
            'nombre_comercial' => 'Constructora y Remodelaciones Valle del Mantaro S.A.C.',
            'contacto_nombre' => 'Sr. Hernán Quispe Atahuanca',
            'especialidad_texto' => 'Adecuación de Ambientes y Estructuras',
            'telefono' => '51948300117',
            'whatsapp' => '51948300117',
            'sede' => 'El Tambo',
            'cobertura' => 'Huancayo / El Tambo',
            'verificado' => true,
            'servicios' => [
                'Anclaje de estanterías y anaqueles a muro o piso',
                'Adecuación de puertas de salida de apertura hacia afuera',
                'Despeje de rutas y salidas de escape con ancho útil mínimo',
                'Remodelaciones menores y resanes en muros',
            ],
        ],
    ];

    /**
     * Criterio normativo del checklist ITSE => categoría de especialidad.
     *
     * @var array<string, string>
     */
    private const CRITERIO_CATEGORIA = [
        'EXTINTOR' => 'incendios',
        'EXTINTOR_PQS' => 'incendios',
        'EXTINTOR_K' => 'incendios',
        'DETECTORES_HUMO' => 'incendios',
        'CAMPANA_EXTRACCION' => 'incendios',
        'DIFERENCIAL' => 'electricas',
        'TERMOMAGNETICO' => 'electricas',
        'TABLERO_MANDIL' => 'electricas',
        'POZO_TIERRA' => 'electricas',
        'CABLEADO_CANALIZADO' => 'electricas',
        'LUCES_EMERG' => 'arquitectura_senaletica',
        'SENALETICA' => 'arquitectura_senaletica',
        'AFORO_CARTEL' => 'arquitectura_senaletica',
        'EVACUACION' => 'arquitectura_senaletica',
        'PUERTAS_ESCAPE' => 'arquitectura_senaletica',
        'BOTIQUIN' => 'arquitectura_senaletica',
        'ANCLAJE_ESTANTERIAS' => 'estructuras',
        'LAMINADO_VIDRIOS' => 'estructuras',
    ];

    /**
     * Equivalencia entre el catálogo normativo de la base de datos
     * (tabla `criterios_normativos`, códigos CRIT-xx) y los códigos técnicos del
     * checklist ITSE que usa este servicio.
     *
     * Ambas familias describen la misma condición técnica con identificadores
     * distintos: el flujo ciudadano (Checklist, Resumen, Subsanación) viaja por
     * CRIT-xx, mientras que el catálogo de costos y la guía de autoayuda usan el
     * código técnico. Sin esta tabla el directorio nunca resolvería un criterio
     * real del flujo.
     *
     * Los criterios sin equivalente técnico (GLP, espacio libre frente al tablero,
     * distancia a fuentes de calor, calderas) se dejan fuera a propósito: es
     * preferible no ofrecer aliados antes que ofrecer los equivocados.
     *
     * @var array<string, string>
     */
    private const CODIGO_NORMATIVO_ITSE = [
        'CRIT-01' => 'EXTINTOR_PQS',
        'CRIT-02A' => 'EXTINTOR_K',
        'CRIT-02B' => 'SENALETICA',
        'CRIT-03' => 'EVACUACION',
        'CRIT-04' => 'PUERTAS_ESCAPE',
        'CRIT-05' => 'POZO_TIERRA',
        'CRIT-06' => 'TABLERO_MANDIL',
        'CRIT-07' => 'CABLEADO_CANALIZADO',
        'CRIT-08' => 'LUCES_EMERG',
        'CRIT-09' => 'BOTIQUIN',
        'CRIT-12' => 'AFORO_CARTEL',
        'CRIT-13' => 'ANCLAJE_ESTANTERIAS',
        'CRIT-15' => 'DETECTORES_HUMO',
        'CRIT-16' => 'CAMPANA_EXTRACCION',
    ];

    /**
     * Grupos de disciplina técnica que se presentan al ciudadano.
     */
    public const ESPECIALIDADES = [
        'electricas' => 'Instalaciones Eléctricas',
        'incendios' => 'Seguridad e Incendios',
        'arquitectura' => 'Arquitectura y Evacuación',
        'estructuras' => 'Estructuras y Almacenamiento',
    ];

    /**
     * Disciplina de cada criterio del catálogo normativo, clasificada por su
     * categoría técnica real en `criterios_normativos`.
     *
     * Esta tabla es intencionalmente más amplia que CODIGO_NORMATIVO_ITSE: el
     * desglose por especialidad debe contabilizar TODAS las condiciones evaluadas
     * para que la suma de los cuatro grupos cuadre con el total del resumen. Por
     * eso aquí entran también las condiciones sin equivalente en el directorio
     * de aliados (GLP, espacio libre, calderas), que sí tienen disciplina
     * técnica clara aunque no tengan un especialista asociado.
     *
     * @var array<string, string>
     */
    private const ESPECIALIDAD_POR_CODIGO = [
        'CRIT-01' => 'incendios',
        'CRIT-02A' => 'incendios',
        'CRIT-02B' => 'arquitectura',
        'CRIT-03' => 'arquitectura',
        'CRIT-04' => 'arquitectura',
        'CRIT-05' => 'electricas',
        'CRIT-06' => 'electricas',
        'CRIT-07' => 'electricas',
        'CRIT-08' => 'arquitectura',
        'CRIT-09' => 'arquitectura',
        'CRIT-10' => 'incendios',
        'CRIT-11' => 'estructuras',
        'CRIT-12' => 'arquitectura',
        'CRIT-13' => 'estructuras',
        'CRIT-14A' => 'electricas',
        'CRIT-14B' => 'incendios',
        'CRIT-15' => 'incendios',
        'CRIT-16' => 'incendios',
        'CRIT-17' => 'incendios',
    ];

    public function __construct(private readonly ItseRiskService $itseRiskService) {}

    /**
     * Todas las categorías soportadas por el directorio.
     *
     * @return array<int, string>
     */
    public function categorias(): array
    {
        return self::CATEGORIAS;
    }

    /**
     * Directorio completo, en formato público.
     *
     * @return array<int, array<string, mixed>>
     */
    public function todos(): array
    {
        return array_map($this->registroPublico(...), self::ALIADOS);
    }

    /**
     * Aliados de una especialidad técnica.
     *
     * @return array<int, array<string, mixed>>
     */
    public function obtenerPorCategoria(string $categoria): array
    {
        $categoria = mb_strtolower(trim($categoria));

        if (! in_array($categoria, self::CATEGORIAS, true)) {
            return [];
        }

        return array_map(
            $this->registroPublico(...),
            array_values(array_filter(
                self::ALIADOS,
                fn (array $aliado): bool => $aliado['categoria'] === $categoria,
            )),
        );
    }

    /**
     * Agrupa las condiciones evaluadas por disciplina técnica ITSE.
     *
     * Cada grupo expone `alertas` (pendientes por atender más las marcadas por
     * revisar), `cumplidas` y `total`. Un grupo queda `en_orden` únicamente
     * cuando no tiene alertas.
     *
     * Los estados `NO_APLICA` se excluyen del conteo: no son una condición
     * evaluada. Los códigos ausentes de ESPECIALIDAD_POR_CODIGO tampoco se
     * contabilizan en ningún grupo.
     *
     * @param  array<int, array{codigo?: string|null, estado?: string|null}>  $condiciones
     * @return array<string, array{nombre: string, alertas: int, cumplidas: int, total: int, estado: 'en_orden'|'pendiente'}>
     */
    public function desglosePorEspecialidad(array $condiciones): array
    {
        $conteos = array_map(
            fn (string $nombre): array => [
                'nombre' => $nombre,
                'alertas' => 0,
                'cumplidas' => 0,
                'total' => 0,
                'estado' => 'en_orden',
            ],
            self::ESPECIALIDADES
        );

        foreach ($condiciones as $condicion) {
            $especialidad = self::ESPECIALIDAD_POR_CODIGO[mb_strtoupper(trim((string) ($condicion['codigo'] ?? '')))] ?? null;

            if ($especialidad === null) {
                continue;
            }

            $estado = $condicion['estado'] ?? null;

            if ($estado === ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO) {
                $conteos[$especialidad]['cumplidas']++;
                $conteos[$especialidad]['total']++;
            } elseif (in_array($estado, [
                ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER,
                ApplicabilityEngineService::ESTADO_POR_REVISAR,
            ], true)) {
                $conteos[$especialidad]['alertas']++;
                $conteos[$especialidad]['total']++;
            }
        }

        foreach ($conteos as &$grupo) {
            $grupo['estado'] = $grupo['alertas'] === 0 ? 'en_orden' : 'pendiente';
        }
        unset($grupo);

        return $conteos;
    }

    /**
     * Normaliza un criterio a su código técnico ITSE.
     *
     * Acepta ambas familias de identificadores: el código CRIT-xx del catálogo
     * normativo y el propio código ITSE, que se devuelve sin cambios.
     */
    public function normalizarCodigo(string $codigoCriterio): string
    {
        $codigo = mb_strtoupper(trim($codigoCriterio));

        return self::CODIGO_NORMATIVO_ITSE[$codigo] ?? $codigo;
    }

    /**
     * Resuelve el aliado sugerido, la guía de autoayuda y el rango de costo
     * referencial para un criterio del checklist ITSE.
     *
     * @return array{
     *     criterio: string,
     *     criterio_conocido: bool,
     *     categoria: string|null,
     *     aliado: array<string, mixed>|null,
     *     alternativas: array<int, array<string, mixed>>,
     *     guia_autoayuda: array<int, string>,
     *     norma: string|null,
     *     rango_costo: array{referencia_soles: float, minimo_soles: float, maximo_soles: float}|null
     * }
     */
    public function obtenerPorCriterio(string $criterioCodigo): array
    {
        $criterioCodigo = $this->normalizarCodigo($criterioCodigo);
        $categoria = self::CRITERIO_CATEGORIA[$criterioCodigo] ?? null;
        $catalogo = ItseRiskService::COSTOS_REFERENCIALES[$criterioCodigo] ?? null;

        if ($categoria === null || $catalogo === null) {
            return [
                'criterio' => $criterioCodigo,
                'criterio_conocido' => false,
                'categoria' => $categoria,
                'aliado' => null,
                'alternativas' => [],
                'guia_autoayuda' => [],
                'norma' => null,
                'rango_costo' => null,
            ];
        }

        $aliados = $this->obtenerPorCategoria($categoria);

        return [
            'criterio' => $criterioCodigo,
            'criterio_conocido' => true,
            'categoria' => $categoria,
            'aliado' => $aliados[0] ?? null,
            'alternativas' => array_values(array_slice($aliados, 1)),
            'guia_autoayuda' => $this->guiaAutoayuda($criterioCodigo),
            'norma' => $catalogo['norma'] ?? null,
            'rango_costo' => $this->rangoCosto((float) ($catalogo['costo_soles'] ?? 0.0)),
        ];
    }

    /**
     * Rango referencial derivado del costo canónico del criterio: hasta -20%
     * para una intervención simple y hasta +50% por mayor complejidad,
     * antigüedad de la instalación o certificación del proveedor.
     *
     * @return array{referencia_soles: float, minimo_soles: float, maximo_soles: float}
     */
    private function rangoCosto(float $referencia): array
    {
        return [
            'referencia_soles' => round($referencia, 2),
            'minimo_soles' => round($referencia * 0.80, 2),
            'maximo_soles' => round($referencia * 1.50, 2),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function guiaAutoayuda(string $criterioCodigo): array
    {
        return match ($criterioCodigo) {
            'EXTINTOR', 'EXTINTOR_PQS' => [
                'Verifica que el manómetro marque la zona verde y que la etiqueta de mantenimiento esté vigente.',
                'Ubica el extintor entre 0.30 m y 1.00 m del piso, accesible y sin obstrucciones.',
                'Si la carga venció o el precinto está roto, solicita la recarga a una empresa certificada y exige la tarjeta de mantenimiento.',
            ],
            'EXTINTOR_K' => [
                'Coloca el extintor Tipo K a menos de 1.50 m de la freidora o del punto de riesgo de cocción.',
                'Verifica que el agente sea acetato de potasio y que la placa de identificación sea legible.',
                'No sustituyas el Tipo K por un extintor PQS: la base de sodio reacciona de forma peligrosa con grasas.',
            ],
            'DETECTORES_HUMO' => [
                'Limpia el sensor fotoeléctrico con un paño seco y verifica que no tenga obstrucciones ni polvo.',
                'Pulsa el botón de prueba y confirma la alarma sonora y el led intermitente.',
                'Sustituye la pila del detector autónomo según la vida útil del fabricante y anota la fecha.',
            ],
            'CAMPANA_EXTRACCION' => [
                'Retira y lava los filtros metálicos con desengrasante; reemplaza los que estén deformados.',
                'Verifica que el ducto sea incombustible y que la campana no tenga fugas de aire caliente.',
                'Limpia el extractor y el ducto cada 3 meses en establecimientos de alta cocina.',
            ],
            'DIFERENCIAL', 'TERMOMAGNETICO' => [
                'Prueba el botón TEST del diferencial y registra el resultado.',
                'Confirma que la corriente nominal de la protección calce con la sección del cable instalado.',
                'Elimina puentes de alambre y empalmes; deja el tablero bajo llave.',
                'Contrata a un electricista colegiado si el diferencial no dispara o no responde al TEST.',
            ],
            'TABLERO_MANDIL' => [
                'Instala el mandil protector de resina o metal cubriendo todos los conductores activos.',
                'Coloca tapas ciegas en cada espacio libre del tablero y etiqueta los circuitos.',
                'Retira cables quemados o con aislamiento deteriorado y canalízalos.',
            ],
            'POZO_TIERRA' => [
                'Solicita el protocolo de medición de resistencia de puesta a tierra; el valor debe ser menor o igual a 25 Ohmios.',
                'Mantén visible, protegido y rotulado el punto de medición del pozo a tierra.',
                'No cortes ni empalmes el conductor de tierra; exígelo por escrito al electricista.',
            ],
            'CABLEADO_CANALIZADO' => [
                'Retira los cables sueltos y canalízalos en canaletas o tuberías sin empalmes expuestos.',
                'Sustituye los empalmes por conectores homologados dentro de cajas de paso accesibles.',
                'Separa las canalizaciones eléctricas de las de gases.',
            ],
            'LUCES_EMERG' => [
                'Verifica que la luz de emergencia tenga autonomía de 90 minutos y batería en buen estado.',
                'Colócala sobre la puerta de salida y en los puntos de la ruta de evacuación.',
                'Prueba el equipo con el interruptor general apagado: debe seguir encendida.',
            ],
            'SENALETICA' => [
                'Coloca señales fotoluminiscentes de Salida en cada puerta y en los tramos de la ruta de evacuación.',
                'Verifica que las señales de Extintor y Riesgo Eléctrico correspondan a NTP 399.010-1.',
                'Limpia las señales para mantener el nivel de contraste y visibilidad.',
            ],
            'AFORO_CARTEL' => [
                'Coloca el cartel de aforo máximo en el acceso principal, visible desde el exterior.',
                'Vigila que la capacidad indicada coincida con el número de mesas, sillas y estantes reales.',
                'Mantén actualizado el aforo declarado en el sistema.',
            ],
            'EVACUACION' => [
                'Despeja totalmente las rutas y salidas de escape; ancho útil mínimo de 0.90 m a 1.20 m.',
                'Elimina mercadería y cajas en los pasillos y frente a las puertas.',
                'Marca en el piso el recorrido de evacuación y manténlo despejado de manera permanente.',
            ],
            'PUERTAS_ESCAPE' => [
                'Verifica que la puerta de salida abra hacia afuera sin herramientas y sin cerrojos trabados.',
                'Retira candados o trabas que impidan la apertura durante el horario de atención.',
                'Mantén la barra antipánico libre de obstrucciones si la capacidad del local lo exige.',
            ],
            'BOTIQUIN' => [
                'Adosa el botiquín a la pared en una zona visible y accesible, entre 1.00 m y 1.50 m de altura.',
                'Verifica el contenido mínimo vigente y reemplaza lo que esté vencido o abierto.',
                'Registra la fecha de revisión y designa a un responsable del abastecimiento.',
            ],
            'ANCLAJE_ESTANTERIAS' => [
                'Ancla a muro o piso toda estantería o anaquel cuya altura supere los 1.80 m.',
                'Usa pernos y anclajes adecuados al tipo de muro (ladrillo, concreto o tabiquería con refuerzo).',
                'Pide un peritaje básico si la estantería ya se inclinó o la pared muestra grietas.',
            ],
            'LAMINADO_VIDRIOS' => [
                'Instala lámina de seguridad de 4 micras o vidrio templado en lunas crudas.',
                'Marca con una franja visible los vidrios instalados a la altura de la vista.',
                'Solicita el cambio inmediato de cualquier luna astillada y no la mantengas en uso.',
            ],
            default => [],
        };
    }

    /**
     * Proyecta un registro interno del directorio al formato de contrato
     * público, conservando los campos de contacto consumibles por el cliente.
     *
     * @param  array<string, mixed>  $aliado
     * @return array<string, mixed>
     */
    private function registroPublico(array $aliado): array
    {
        return [
            'id' => $aliado['id'],
            'categoria' => $aliado['categoria'],
            'nombre_comercial' => $aliado['nombre_comercial'],
            'contacto_nombre' => $aliado['contacto_nombre'],
            'especialidad_texto' => $aliado['especialidad_texto'],
            'telefono' => $aliado['telefono'],
            'whatsapp' => $aliado['whatsapp'],
            'sede' => $aliado['sede'],
            'cobertura' => $aliado['cobertura'],
            'verificado' => (bool) $aliado['verificado'],
            'servicios' => array_values($aliado['servicios']),
        ];
    }
}
