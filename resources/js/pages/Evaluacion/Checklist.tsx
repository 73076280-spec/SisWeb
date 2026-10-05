import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import { GuiaPedagogicaModal } from '@/components/Evaluacion/GuiaPedagogicaModal';
import {
    ClipboardList,
    CheckCircle2,
    HelpCircle,
    AlertCircle,
    AlertTriangle,
    Info,
    ShieldAlert,
    Save,
    Check,
    Building2,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Lock,
    BookOpen,
    Flame,
    Footprints,
    Zap,
    Shield,
    Lightbulb,
    Scale,
    Ruler,
    Users,
} from 'lucide-react';
import type { ChecklistProps, CriterioEvaluable } from '@/types/contrato';

interface OpcionConfig {
    label: string;
    descripcion: string;
    icono: React.ComponentType<{ className?: string }>;
    borderSelected: string;
    bgSelected: string;
    ringSelected: string;
    textSelected: string;
    iconSelected: string;
    radioAccent: string;
}

/**
 * Catálogo cerrado y exclusivo de las tres declaraciones ciudadanas permitidas por
 * `ApplicabilityEngineService::RESPUESTAS_CIUDADANAS_PERMITIDAS`. El estado
 * `NO_APLICA` es una determinación exclusiva del sistema y jamás se ofrece aquí,
 * por eso no aparece como opción ni como etiqueta en el selector segmentado.
 */
const OPCIONES_ETIQUETAS: Record<string, OpcionConfig> = {
    CUMPLE_DECLARADO: {
        label: 'Cumple',
        descripcion: 'La condición existe en tu local según lo que declaras.',
        icono: CheckCircle2,
        borderSelected: 'border-emerald-500',
        bgSelected: 'bg-emerald-50/70',
        ringSelected: 'ring-2 ring-emerald-500/20',
        textSelected: 'text-emerald-950 font-bold',
        iconSelected: 'text-emerald-600',
        radioAccent: 'text-emerald-600 focus:ring-emerald-500',
    },
    PENDIENTE_ATENDER: {
        label: 'Por subsanar',
        descripcion: 'Falta corregir, adquirir o mantener antes de una inspección.',
        icono: AlertTriangle,
        borderSelected: 'border-amber-500',
        bgSelected: 'bg-amber-50/70',
        ringSelected: 'ring-2 ring-amber-500/20',
        textSelected: 'text-amber-950 font-bold',
        iconSelected: 'text-amber-600',
        radioAccent: 'text-amber-600 focus:ring-amber-500',
    },
    POR_REVISAR: {
        label: 'Por revisar',
        descripcion: 'No puedes confirmarlo todavía: consulta con un técnico.',
        icono: HelpCircle,
        borderSelected: 'border-slate-900',
        bgSelected: 'bg-slate-100',
        ringSelected: 'ring-2 ring-slate-900/10',
        textSelected: 'text-slate-900 font-bold',
        iconSelected: 'text-slate-900',
        radioAccent: 'text-slate-900 focus:ring-slate-500',
    },
};

const OPCIONES_FALLBACK = ['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'];

interface AreaNormativa {
    id: string;
    nombre: string;
    nombreCorto: string;
    icono: React.ComponentType<{ className?: string }>;
    criterios: CriterioEvaluable[];
}

/**
 * Agrupa los criterios en las especialidades normadas del catálogo.
 *
 * El enrutamiento por `categoria` es preexistente y no se modifica: cada criterio
 * cae en el mismo lugar que antes, de modo que ninguna condición puede quedar
 * inalcanzable al introducir las pestañas. Lo único que cambia es el rótulo
 * mostrado al ciudadano, que sigue las cuatro disciplinas de la ITSE.
 *
 * El orden de `definiciones` es el orden de presentación de las pestañas. Como
 * `gas` se conserva como quinta especialidad cuando el catálogo le asigna
 * criterios —excluirla dejaría ese grupo real de "Instalaciones de Gas" sin
 * pestaña donde responder— el fallback de categorías no reconocidas se ancla
 * por id a `incendios` en lugar de usar la posición del array.
 */
function agruparCriteriosPorArea(criterios: CriterioEvaluable[]): AreaNormativa[] {
    const definiciones = [
        {
            id: 'electricas',
            nombre: 'Instalaciones Eléctricas',
            nombreCorto: 'Eléctricas',
            icono: Zap,
            match: (cat: string) => cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'incendios',
            nombre: 'Seguridad y Contra Incendios',
            nombreCorto: 'Incendios',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('incendio'),
        },
        {
            id: 'evacuacion',
            nombre: 'Arquitectura y Evacuación',
            nombreCorto: 'Evacuación',
            icono: Footprints,
            match: (cat: string) =>
                (cat.toLowerCase().includes('evacuación') || cat.toLowerCase().includes('señalización')) &&
                !cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'estructuras',
            nombre: 'Almacenamiento y Estructuras',
            nombreCorto: 'Estructuras',
            icono: Shield,
            match: (cat: string) =>
                cat.toLowerCase().includes('estructur') ||
                cat.toLowerCase().includes('sísmic') ||
                cat.toLowerCase().includes('accesibilidad') ||
                cat.toLowerCase().includes('almacenamiento'),
        },
        {
            id: 'gas',
            nombre: 'Instalaciones de Gas',
            nombreCorto: 'Gas',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('gas') || cat.toLowerCase().includes('glp'),
        },
    ];

    const areas: AreaNormativa[] = definiciones.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        nombreCorto: d.nombreCorto,
        icono: d.icono,
        criterios: [],
    }));

    // Área de referencia para categorías que no encajan en ninguna especialidad
    // (p. ej. primeros auxilios, calderas o ventilación). Fijada por id y no por
    // posición para que reordenar las pestañas por especialidad no mueva criterios
    // de un grupo a otro.
    const areaFallback = areas.find((a) => a.id === 'incendios') ?? areas[0];

    for (const c of criterios) {
        const cat = c.categoria || '';
        const area = areas.find((a) => {
            const def = definiciones.find((d) => d.id === a.id);
            return def?.match(cat);
        });

        if (area) {
            area.criterios.push(c);
        } else if (areaFallback) {
            areaFallback.criterios.push(c);
        }
    }

    return areas.filter((a) => a.criterios.length > 0);
}

/**
 * Identidad visual de cada especialidad. Solo describe presentación: el área a la
 * que pertenece un criterio lo sigue decidiendo `agruparCriteriosPorArea` a partir
 * de la categoría normativa, y la base normativa real de cada criterio llega
 * individualizada en `criterio.norma_base` / `criterio.articulo_referencia`.
 */
interface EstiloArea {
    banner: string;
    acento: string;
    chipIcono: string;
    badgeNorma: string | null;
    bordeCriterio: string;
}

const CONFIG_AREA: Record<string, EstiloArea> = {
    incendios: {
        banner: 'border-rose-200 bg-rose-50',
        acento: 'text-rose-700',
        chipIcono: 'border-rose-200 bg-white',
        badgeNorma: 'NTP 350.043-1',
        bordeCriterio: 'border-l-rose-500',
    },
    evacuacion: {
        banner: 'border-emerald-200 bg-emerald-50',
        acento: 'text-emerald-700',
        chipIcono: 'border-emerald-200 bg-white',
        badgeNorma: 'RNE A.010 / A.130',
        bordeCriterio: 'border-l-emerald-500',
    },
    electricas: {
        banner: 'border-amber-200 bg-amber-50',
        acento: 'text-amber-700',
        chipIcono: 'border-amber-200 bg-white',
        badgeNorma: 'Código Nacional de Electricidad',
        bordeCriterio: 'border-l-amber-500',
    },
    estructuras: {
        banner: 'border-blue-200 bg-blue-50',
        acento: 'text-blue-700',
        chipIcono: 'border-blue-200 bg-white',
        badgeNorma: 'RNE Seguridad Estructural',
        bordeCriterio: 'border-l-blue-500',
    },
    gas: {
        banner: 'border-orange-200 bg-orange-50',
        acento: 'text-orange-700',
        chipIcono: 'border-orange-200 bg-white',
        badgeNorma: null,
        bordeCriterio: 'border-l-orange-500',
    },
};

const CONFIG_AREA_POR_DEFECTO: EstiloArea = {
    banner: 'border-slate-200 bg-slate-50',
    acento: 'text-slate-700',
    chipIcono: 'border-slate-200 bg-white',
    badgeNorma: null,
    bordeCriterio: 'border-l-slate-400',
};

/**
 * Guía comparativa "Correcto vs. Incorrecto" de los criterios de mayor incidencia
 * en el comercio. Es contenido pedagógico fijo derivado de la redacción oficial
 * de cada criterio en `NormativaCatalogSeeder` (pregunta ciudadana, qué observar y
 * acción de mejora); no alimenta ningún cálculo de estado ni de puntaje.
 */
interface GuiaComparativa {
    explicacionCotidiana?: string;
    correcto: string[];
    incorrecto: string[];
}

const COMPARATIVA_CORRECTO_INCORRECTO: Record<string, GuiaComparativa> = {
    'CRIT-01': {
        explicacionCotidiana:
            'El extintor es tu primera línea de defensa ante un conato de incendio. Debe estar a la mano, con carga presurizada y revisión técnica anual garantizada por una empresa autorizada.',
        correcto: [
            'Extintor colgado en pared o pedestal visible, accesible y sin mercadería ni cajas delante.',
            'Aguja del manómetro dentro de la franja verde operable (presión correcta).',
            'Tarjeta o collarín de mantenimiento con fecha de recarga menor a 1 año.',
            'Instalado a una altura máxima de 1.50 m del piso medido desde la manija.',
            'Precinto y pasador de seguridad intactos, sin señales de manipulación.',
        ],
        incorrecto: [
            'Extintor escondido detrás de vitrinas, tapado con ropa o dentro de armarios bajo llave.',
            'Manómetro en zona roja (descargado o con sobrepresión riesgosa).',
            'Tarjeta de mantenimiento vencida (más de 12 meses), ilegible o inexistente.',
            'Extintor apoyado directamente en el suelo o colgado a más de 1.50 m.',
            'Cilindro golpeado, oxidado, con manguera rota o sin pasador.',
        ],
    },
    'CRIT-02A': {
        explicacionCotidiana:
            'Los fuegos por grasa o aceite caliente en cocinas y freidoras NO se apagan con agua ni con extintor común de polvo PQS (que puede esparcir el aceite hirviendo). Se exige químico húmedo Clase K (acetato de potasio) que saponifica y enfría el aceite.',
        correcto: [
            'Extintor rotulado con la letra "K" en hexágono específico de cocina comercial.',
            'Ubicado a una distancia máxima de 9 metros de freidoras, hornos o planchas.',
            'Manómetro en franja verde y tarjeta de control anual al día.',
            'Agente a base de sales de potasio (químico húmedo que no salpica grasa caliente).',
        ],
        incorrecto: [
            'Tener únicamente extintor PQS frente a freidoras con grandes volúmenes de aceite.',
            'Extintor Clase K ubicado lejos de la cocina (más de 9 metros de recorrido).',
            'Falta de mantenimiento anual o precinto de seguridad roto.',
            'Boquilla o manguera de descarga obstruida con grasa acumulada.',
        ],
    },
    'CRIT-02B': {
        explicacionCotidiana:
            'Las señales de seguridad guían a clientes y trabajadores en segundos hacia la salida o equipos de auxilio, especialmente si hay humo o corte imprevisto de energía eléctrica.',
        correcto: [
            'Carteles verdes con flechas de "SALIDA" colocadas en puntos clave y sobre puertas de escape.',
            'Cartel rojo "EXTINTOR" ubicado exactamente sobre la posición del equipo portátil.',
            'Señal triangular amarilla de "RIESGO ELÉCTRICO" adherida en la tapa exterior del tablero.',
            'Señales fotoluminiscentes que brillan en la oscuridad o iluminadas en rutas principales.',
        ],
        incorrecto: [
            'Falta total de señalización o letreros improvisados en papel bond desgastado.',
            'Señal de "Salida" apuntando en dirección contraria o bloqueada por carteles publicitarios.',
            'Cartel de extintor pegado en una pared donde no hay ningún extintor colocado.',
            'Señales deterioradas, descoloridas, rotas o colocadas a alturas no visibles.',
        ],
    },
    'CRIT-03': {
        explicacionCotidiana:
            'En una emergencia, las personas evacúan apresuradas. Cualquier bulto o estrechamiento del pasillo puede provocar tropiezos y estampidas mortales.',
        correcto: [
            'Pasadizos y camino directo hacia la salida continuos, despejados y con piso uniforme.',
            'Ancho libre reglamentario (mínimo 0.90 m a 1.20 m según aforo) mantenido en todo el recorrido.',
            'Sin fardos, cajas, mercadería exhibida ni mobiliario que estrechen el paso.',
            'Ruta de evacuación completamente iluminada y transitable de inicio a fin.',
        ],
        incorrecto: [
            'Cajas, mercadería o canastillas apiladas en el suelo reduciendo el ancho del pasillo.',
            'Exhibidores, maniquíes o mesas colocados invadiendo la vía de escape.',
            'Pasadizos usados como zona de depósito o carga y descarga temporal permanente.',
            'Pisos con desniveles no señalizados, cables cruzados en el suelo o alfombras sueltas.',
        ],
    },
    'CRIT-04': {
        explicacionCotidiana:
            'La puerta principal de evacuación debe abrirse de inmediato desde el interior con un solo empuje. Nadie debe buscar una llave ni pedir permiso para escapar en una emergencia.',
        correcto: [
            'Puertas de escape desatrancadas y libres de candados durante todo el horario de atención.',
            'Apertura inmediata desde el interior mediante manija simple o barra antipánico (si aforo > 50).',
            'Giro hacia el exterior (sentido de evacuación) para locales comerciales con aforo.',
            'Vía libre al exterior: la vereda o descanso exterior no tiene obstáculos ni rejas cerradas.',
        ],
        incorrecto: [
            'Reja exterior o puerta principal con candado echado mientras hay personas dentro.',
            'Pestillos o cerrojos ocultos que requieren llave para salir al exterior.',
            'Puertas corredizas o enrollables cerradas hasta el piso durante la permanencia de público.',
            'Mobiliario, mercadería o vitrinas colocadas tapando o bloqueando las hojas de la puerta.',
        ],
    },
    'CRIT-05': {
        explicacionCotidiana:
            'El pozo a tierra desvía corrientes de fuga hacia el suelo para evitar descargas a las personas. La norma exige medirlo cada año con telurómetro para certificar que su resistencia no supere los 25 Ohmios.',
        correcto: [
            'Certificado o protocolo de medición con fecha de emisión no mayor a 1 año (vigente).',
            'Valor de resistencia de puesta a tierra medido igual o menor a 25 Ohmios (≤ 25 Ω).',
            'Firmado y sellado por Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado.',
            'Pozo físico con caja de registro visible, rotulada y con conductor de cobre conectado firmemente.',
        ],
        incorrecto: [
            'No contar con el protocolo de medición firmado por ingeniero colegiado.',
            'Protocolo con más de un año de antigüedad (vencido).',
            'Valor medido superior a 25 Ohmios sin mantenimiento ni tratamiento de sales.',
            'Pozo a tierra enterrado bajo concreto sin tapa de registro accesible o con cable desconectado.',
        ],
    },
    'CRIT-06': {
        explicacionCotidiana:
            'El mandil es la tapa interna que oculta los cables con corriente. El interruptor diferencial (el que tiene botón "T") salva vidas cortando la luz en milisegundos si alguien toca un cable energizado.',
        correcto: [
            'Mandil o contratapa interior colocada, cubriendo cables y barras vivas; solo asoman las palancas.',
            'Interruptores termomagnéticos debidamente rotulados con su carga (ej: "Alumbrado 1", "Tomas").',
            'Interruptor diferencial (30 mA) con botón de prueba "T" en todos los circuitos de tomacorrientes.',
            'Gabinete exterior con puerta cerrada y señal de advertencia de riesgo eléctrico pegada.',
        ],
        incorrecto: [
            'Tablero sin mandil: cables internos pelados, borneras o barras metálicas expuestas al tacto.',
            'Ausencia de interruptor diferencial (solo llaves termomagnéticas comunes).',
            'Interruptores sin rotular o con anotaciones borrosas que impiden corte selectivo rápido.',
            'Huecos abiertos en el mandil donde faltan llaves, permitiendo introducir los dedos.',
        ],
    },
    'CRIT-07': {
        explicacionCotidiana:
            'Los cables mellizos planos son flexibles para electrodomésticos portátiles, NUNCA para instalaciones fijas ni grapados a la pared. Se recalientan y provocan cortocircuitos e incendios.',
        correcto: [
            'Todos los conductores eléctricos protegidos dentro de tubos de PVC empotrados o canaletas adosadas.',
            'Conductores tipo THW o libre de halógenos instalados en cajas de paso con tapas cerradas.',
            'Empalmes realizados dentro de cajas de derivación con conectores adecuados o capuchones.',
            'Cables sujetos firmemente sin tramos colgantes ni sometidos a tirantez mecánica.',
        ],
        incorrecto: [
            'Cables mellizos usados como tendido fijo en techos, paredes o clavados con tachuelas.',
            'Cables colgando libremente al alcance de personas o sobre estructuras metálicas.',
            'Empalmes al aire libre envueltos con cinta aislante simple o cinta de embalaje.',
            'Canaletas rotas, sin tapas protectoras o saturadas de cables que impiden su cierre.',
        ],
    },
    'CRIT-08': {
        explicacionCotidiana:
            'En caso de apagón o siniestro, las luces de emergencia encienden automáticamente con su batería interna para iluminar el camino de escape de clientes y personal.',
        correcto: [
            'Equipos de luz de emergencia instalados en rutas de evacuación, cambios de nivel y salidas.',
            'Conectados permanentemente a la red eléctrica (luz testigo encendida indicando carga).',
            'Al presionar el botón "TEST" o desconectarlos, los faros encienden de inmediato con buena intensidad.',
            'Batería autónoma con respaldo operativo comprobado de al menos 60 a 90 minutos.',
        ],
        incorrecto: [
            'Equipo desenchufado, guardado en un cajón o con el enchufe deteriorado.',
            'Al pulsar el botón "TEST", los focos no encienden o emiten una luz muy tenue y parpadeante.',
            'Luminarias apuntando hacia el techo o la pared en vez de enfocar el camino de salida.',
            'Falta de luces de emergencia en locales con más de un ambiente o tramos ciegos.',
        ],
    },
    'CRIT-10': {
        explicacionCotidiana:
            'El gas licuado de petróleo (GLP) es más pesado que el aire y se acumula en el suelo. Un balón en un sótano o mueble cerrado genera una atmósfera inflamable ante la menor chispa.',
        correcto: [
            'Cilindro de GLP ubicado en ambiente con ventilación natural directa a nivel de piso (nunca en sótanos).',
            'Manguera flexible reforzada especial para gas (con fecha legible) de longitud no mayor a 1.5 m.',
            'Abrazaderas metálicas tipo cremallera ajustadas en ambos extremos de la manguera.',
            'Regulador de presión en perfecto estado mecánico y libre de fugas de gas.',
        ],
        incorrecto: [
            'Balón de gas instalado en sótanos, semisótanos o huecos bajo escaleras sin ventilación.',
            'Uso de mangueras de agua (transparentes o de jardín) en vez de manguera normada para GLP.',
            'Manguera asegurada con alambres retorcidos en lugar de abrazaderas metálicas.',
            'Cilindro acostado o colocado a menos de 1.5 metros de tomacorrientes o interruptores eléctricos.',
        ],
    },
    'CRIT-11': {
        explicacionCotidiana:
            'Las caídas en escaleras son el siniestro físico más común en comercios de varios niveles. Los pasamanos continuos y bordes no resbalosos garantizan un descenso seguro.',
        correcto: [
            'Pasamanos continuo instalado a una altura ergonómica reglamentaria (0.90 m a 1.00 m).',
            'Fijación sólida al muro o baranda que soporte el peso y empuje de las personas.',
            'Cintas antideslizantes de alto tránsito o estrías en el borde (voladizo) de cada peldaño.',
            'Peldaños de dimensiones uniformes, limpios, secos y con iluminación suficiente.',
        ],
        incorrecto: [
            'Escalera sin pasamanos o con tubos flojos y desprendidos de la pared.',
            'Peldaños de mayólica o granito pulido lisos y resbaladizos sin material antideslizante.',
            'Escaleras con objetos depositados en los descansos (cajas, baldes, mercadería).',
            'Tramos a oscuras o con peldaños rotos y desportillados.',
        ],
    },
    'CRIT-13': {
        explicacionCotidiana:
            'En una zona de alto peligro sísmico como Huancayo, las estanterías de más de 1.80 m pueden voltearse violentamente sobre las personas o bloquear la única salida.',
        correcto: [
            'Estanterías, anaqueles y vitrinas altas anclados firmemente al muro con escuadras o pernos.',
            'Arriostramiento transversal o unión superior entre módulos para mayor rigidez ante sismos.',
            'Mercadería pesada almacenada en niveles inferiores y productos livianos en la parte alta.',
            'Topes de retención en estantes abiertos para evitar la caída de envases frágiles.',
        ],
        incorrecto: [
            'Anaqueles altos libres y tambaleantes colocados junto a vías de evacuación.',
            'Pilas de cajas pesadas sobre la parte superior de estantes sin ninguna sujeción.',
            'Muebles apoyados sobre tacos de madera inestables o calzados precariamente.',
            'Falta total de pernos o anclajes en estanterías metálicas de gran altura.',
        ],
    },
    'CRIT-14A': {
        explicacionCotidiana:
            'Si ocurre un chispazo o cortocircuito, cualquier persona o bombero debe poder acceder al tablero en dos segundos para cortar la llave general sin tropezar.',
        correcto: [
            'Espacio frontal libre de al menos 1.00 metro de profundidad y ancho del tablero totalmente despejado.',
            'Piso seco y libre de materiales almacenados delante del tablero de distribución.',
            'Acceso inmediato sin tener que mover muebles, estantes o mercadería para alcanzar la tapa.',
            'Área demarcada preferentemente en el piso como zona de seguridad eléctrica.',
        ],
        incorrecto: [
            'Cajas de cartón, fardos de ropa o bultos de mercadería apilados contra el tablero.',
            'Muebles, vitrinas o refrigeradores colocados tapando el acceso al tablero eléctrico.',
            'Materiales inflamables (thinner, solventes, plásticos) almacenados directamente debajo del tablero.',
            'Tablero instalado a más de 2 metros de altura o inaccesible sin escalera de mano.',
        ],
    },
};

/**
 * Normaliza una magnitud del contexto físico declarado por el ciudadano.
 *
 * Devuelve `null` cuando no hay dato utilizable: `null`, `undefined`, `0` y los
 * valores no numéricos significan «no declarado», no «cero». Los bloques
 * paramétricos orientativos se ocultan en ese caso porque calcular sobre 0
 * afirmaría al ciudadano una dotación o una exigencia que nadie declaró.
 */
function magnitudDeclarada(valor: number | null | undefined): number | null {
    if (valor === null || valor === undefined) {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

/**
 * Secuencia del flujo ciudadano, alineada con el stepper de `Nueva.tsx` para que
 * los pasos 1 y 2 compartan el mismo vocabulario.
 */
const PASOS_FLUJO = [
    { numero: '1', titulo: 'Calcular riesgo', estado: 'completado' },
    { numero: '2', titulo: 'Simulacro en vivo', estado: 'activo' },
    { numero: '3', titulo: 'Veredicto', estado: 'pendiente' },
] as const;

export default function Checklist({ autoevaluacion, checklist }: ChecklistProps) {
    const { auth } = usePage().props as { auth?: { user: unknown | null } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [modalRecurso, setModalRecurso] = useState<{
        isOpen: boolean;
        recursos: RecursoEducativoData[];
        codigo?: string;
        titulo?: string;
    }>({
        isOpen: false,
        recursos: [],
    });

    const criteriosAplicables = useMemo(() => checklist?.criterios ?? [], [checklist]);
    const criteriosNoAplican = useMemo(() => checklist?.no_aplican ?? [], [checklist]);
    const criteriosPendientes = useMemo(() => checklist?.informacion_pendiente ?? [], [checklist]);

    // Agrupación dinámica por especialidad normativa
    const areas = useMemo(() => agruparCriteriosPorArea(criteriosAplicables), [criteriosAplicables]);

    // Especialidad abierta en las pestañas. Solo es presentación: el conjunto de
    // criterios, su estado y el payload enviado al servidor no dependen de ella.
    const [especialidadActiva, setEspecialidadActiva] = useState<string>('');

    // Inicializar respuestas locales a partir de los estados previos que el backend entregue
    const [respuestas, setRespuestas] = useState<Record<string, string>>(() => {
        const inicial: Record<string, string> = {};
        for (const c of criteriosAplicables) {
            if (c.estado && c.estado !== 'NO_APLICA') {
                inicial[c.codigo] = c.estado;
            }
        }
        return inicial;
    });

    // Inicializar notas privadas del ciudadano
    const [notas] = useState<Record<string, string>>(() => {
        const inicial: Record<string, string> = {};
        for (const c of criteriosAplicables) {
            if (c.notas) {
                inicial[c.codigo] = c.notas;
            }
        }
        return inicial;
    });

    // Estado de la Guía Visual Pedagógica interactiva (Modal / Drawer ágil)
    const [modalGuiaPedagogica, setModalGuiaPedagogica] = useState<{
        isOpen: boolean;
        codigo?: string;
        titulo?: string;
        explicacionCotidiana?: string;
        queObservar?: string;
        correcto?: string[];
        incorrecto?: string[];
        normaBase?: string | null;
        articuloReferencia?: string | null;
    }>({
        isOpen: false,
    });

    const [criteriosGuardados, setCriteriosGuardados] = useState<Record<string, boolean>>(() => {
        const inicial: Record<string, boolean> = {};
        for (const c of criteriosAplicables) {
            if (c.estado && c.estado !== 'NO_APLICA') {
                inicial[c.codigo] = true;
            }
        }
        return inicial;
    });

    const [guardandoAvance, setGuardandoAvance] = useState<boolean>(false);
    const [guardandoContinuar, setGuardandoContinuar] = useState<boolean>(false);
    const [mensajeExito, setMensajeExito] = useState<string | null>(null);
    const [mensajeError, setMensajeError] = useState<string | null>(null);
    const [mostrarNoAplican, setMostrarNoAplican] = useState<boolean>(false);
    const [mostrarPendientes, setMostrarPendientes] = useState<boolean>(true);

    // Cantidad de criterios aplicables con respuesta seleccionada
    const respondidosCount = useMemo(() => {
        return criteriosAplicables.filter((c) => Boolean(respuestas[c.codigo])).length;
    }, [criteriosAplicables, respuestas]);

    const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';
    const todosRespondidos = respondidosCount === criteriosAplicables.length && criteriosAplicables.length > 0;
    const puedeVerResumen = todosRespondidos || esRegistrada;
    const porcentajeAvance = criteriosAplicables.length > 0 ? Math.round((respondidosCount / criteriosAplicables.length) * 100) : 0;

    /**
     * Contexto paramétrico del establecimiento.
     *
     * Estos valores salen del paso 1 y son idénticos para todos los criterios, así
     * que se derivan una sola vez a nivel de página. `magnitudDeclarada` se aplica
     * sin excepciones: un dato no declarado llega como `null` y entonces el bloque
     * orientativo no se renderiza, en vez de calcular sobre cero.
     */
    const areaM2Declarada = magnitudDeclarada(autoevaluacion?.area_m2);
    const pisosDeclarados = magnitudDeclarada(autoevaluacion?.pisos);
    const aforoDeclarado = magnitudDeclarada(autoevaluacion?.aforo);
    const areaM2Num = areaM2Declarada ?? 0;
    const aforoNum = aforoDeclarado ?? 0;

    const extintoresMinimos = areaM2Declarada !== null ? Math.ceil(areaM2Declarada / 60) : 0;
    const extintoresPorPisos = pisosDeclarados;
    const extintoresSugeridos = Math.max(1, Math.max(extintoresMinimos, extintoresPorPisos ?? 0));

    /** Los bloques paramétricos solo se muestran si existe el dato que los sustenta. */
    const mostrarDotacionExtintores = areaM2Declarada !== null;
    const mostrarExigenciasAforo = aforoDeclarado !== null;

    const mostrarAlertaAforo50 = aforoNum > 50;
    const mostrarAlertaAforo100 = aforoNum > 100;
    const tieneEquiposFritura =
        autoevaluacion?.tiene_equipos_fritura ??
        (autoevaluacion?.caracteristicas_declaradas as
            | { tiene_equipos_fritura?: boolean | null }
            | null
            | undefined)?.tiene_equipos_fritura ??
        null;

    // Hallazgos en vivo: se derivan de `respuestas` y no mantienen estado propio, así que
    // el panel lateral no introduce ninguna mutación extra. Un criterio cuenta como falta
    // cuando el ciudadano lo declara pendiente de atender o por revisar: son exactamente
    // los dos estados que el backend suma como `alertas` en `desglose_especialidades`.
    const hallazgos = useMemo(
        () =>
            criteriosAplicables.filter((c) => {
                const estado = respuestas[c.codigo];
                return estado === 'PENDIENTE_ATENDER' || estado === 'POR_REVISAR';
            }),
        [criteriosAplicables, respuestas]
    );
    const faltasDetectadas = hallazgos.length;

    /**
     * Progreso por especialidad para las pestañas. Se deriva de `respuestas`, igual
     * que el total, así que el contador de cada píldora y la barra global nunca
     * pueden discrepar.
     */
    const progresoPorArea = useMemo(
        () =>
            areas.map((area) => {
                const respondidos = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
                return {
                    id: area.id,
                    respondidos,
                    total: area.criterios.length,
                    pendientes: area.criterios.length - respondidos,
                    completo: respondidos === area.criterios.length,
                };
            }),
        [areas, respuestas]
    );

    // Si el catálogo no trae criterios (o la pestaña activa desaparece), la vista
    // cae en la primera especialidad disponible sin dejar la sección vacía.
    const especialidadVisible = areas.find((area) => area.id === especialidadActiva) ?? areas[0] ?? null;
    const estiloEspecialidad = especialidadVisible
        ? (CONFIG_AREA[especialidadVisible.id] ?? CONFIG_AREA_POR_DEFECTO)
        : null;
    const IconoAreaActivo = especialidadVisible?.icono ?? ClipboardList;
    const avanceEspecialidad = especialidadVisible
        ? progresoPorArea.find((p) => p.id === especialidadVisible.id)
        : undefined;

    /** Lleva al ciudadano al primer criterio sin responder de la especialidad abierta. */
    const enfocarPrimerPendiente = () => {
        const primerPendiente = especialidadVisible?.criterios.find((c) => !respuestas[c.codigo]);
        if (!primerPendiente) return;

        document
            .getElementById(`criterio-${primerPendiente.codigo}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const seleccionarRespuesta = (codigo: string, estado: string) => {
        if (esRegistrada) {
            return;
        }

        setRespuestas((prev) => ({
            ...prev,
            [codigo]: estado,
        }));

        // Si el usuario cambia su respuesta, ya no se considera "guardada" en el servidor hasta que presione guardar
        setCriteriosGuardados((prev) => ({
            ...prev,
            [codigo]: false,
        }));

        setMensajeExito(null);
        setMensajeError(null);

        // Desplazamiento suave guiado hacia la siguiente pregunta sin responder tras 350ms
        if (especialidadVisible) {
            const indexActual = especialidadVisible.criterios.findIndex((c) => c.codigo === codigo);
            if (indexActual >= 0) {
                const siguienteSinResponder = especialidadVisible.criterios
                    .slice(indexActual + 1)
                    .find((c) => !respuestas[c.codigo] && c.codigo !== codigo);

                if (siguienteSinResponder) {
                    setTimeout(() => {
                        const el = document.getElementById(`criterio-${siguienteSinResponder.codigo}`);
                        if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 350);
                }
            }
        }
    };

    // Acción Secundaria: Guardar Avance (persiste desde 1 respuesta, mantiene INICIADA)
    const handleGuardarAvance = async () => {
        if (esRegistrada) return;

        const respuestasAEnviar = Object.entries(respuestas)
            .filter(([, estado]) => Boolean(estado))
            .map(([codigo, estado]) => ({
                codigo,
                estado,
                notas: (notas[codigo] || '').trim() || null,
            }));

        if (respuestasAEnviar.length === 0) {
            setMensajeError('Seleccione al menos una declaración para guardar avance.');
            return;
        }

        setGuardandoAvance(true);
        setMensajeError(null);
        setMensajeExito(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/checklist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ respuestas: respuestasAEnviar }),
            });

            const data = await response.json();

            if (response.ok) {
                setMensajeExito(
                    `Avance guardado correctamente (${respuestasAEnviar.length} de ${criteriosAplicables.length} respondidos). Puede continuar en cualquier momento.`
                );
                const nuevosGuardados = { ...criteriosGuardados };
                for (const item of respuestasAEnviar) {
                    nuevosGuardados[item.codigo] = true;
                }
                setCriteriosGuardados(nuevosGuardados);
            } else if (response.status === 422) {
                const errorMsg =
                    data.errors && typeof data.errors === 'object'
                        ? Object.values(data.errors).flat().join(' ')
                        : data.message || 'Algunas declaraciones no son válidas.';
                setMensajeError(errorMsg);
            } else {
                setMensajeError(data.mensaje || 'No fue posible guardar su avance. Intente nuevamente.');
            }
        } catch {
            setMensajeError('No fue posible guardar su avance. Verifique su conexión e intente nuevamente.');
        } finally {
            setGuardandoAvance(false);
        }
    };

    // Acción Principal: Continuar al Resumen (comprueba 100%, persiste y redirige a /resumen)
    const handleContinuarAlResumen = async () => {
        if (esRegistrada) {
            router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`);
            return;
        }

        const faltantes = criteriosAplicables.filter((c) => !respuestas[c.codigo]);
        if (faltantes.length > 0) {
            setMensajeError(
                `Tiene ${faltantes.length} criterio(s) sin responder. Por favor, declare la situación de todas las condiciones aplicables para continuar al resumen.`
            );
            const primerFaltanteElem = document.getElementById(`criterio-${faltantes[0].codigo}`);
            if (primerFaltanteElem) {
                primerFaltanteElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setGuardandoContinuar(true);
        setMensajeError(null);
        setMensajeExito(null);

        const respuestasAEnviar = criteriosAplicables.map((c) => ({
            codigo: c.codigo,
            estado: respuestas[c.codigo],
            notas: (notas[c.codigo] || '').trim() || null,
        }));

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/checklist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ respuestas: respuestasAEnviar }),
            });

            if (response.ok) {
                router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`);
            } else {
                const data = await response.json();
                setMensajeError(data.mensaje || 'No fue posible guardar las declaraciones para continuar. Intente nuevamente.');
                setGuardandoContinuar(false);
            }
        } catch {
            setMensajeError('Ocurrió un error al intentar continuar al resumen. Intente nuevamente.');
            setGuardandoContinuar(false);
        }
    };

    return (
        <>
            <Head title="Paso 2 de 3: Checklist de Autoevaluación - CheckITSE Huancayo" />

            {/* Escritorio: retícula de 12 columnas con el formulario a la izquierda y el
                panel de hallazgos a la derecha. Por debajo de `lg` esto es un bloque normal,
                así que la experiencia móvil queda idéntica. */}
            <div className="relative mx-auto max-w-4xl lg:max-w-6xl lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
                {/* Capa de patrón grid sutil, acotada a la columna de contenido */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-slate-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-200)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_10%,transparent_100%)]"
                />

                <div className="space-y-7 pb-32 lg:col-span-8">
                    {/* ============================================== */}
                    {/* Cabecera: título de la lista, contexto y       */}
                    {/* acciones discretas de guardado/regreso         */}
                    {/* ============================================== */}
                    <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <ol
                            aria-label="Flujo de autoevaluación: 1. Calcular riesgo, 2. Simulacro en vivo, 3. Veredicto"
                            className="mb-5 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3"
                        >
                            {PASOS_FLUJO.map((paso, indice) => {
                                const activo = paso.estado === 'activo';
                                const completado = paso.estado === 'completado';
                                return (
                                    <li key={paso.numero} className="flex items-center gap-2 sm:gap-3">
                                        <div
                                            aria-current={activo ? 'step' : undefined}
                                            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                                                activo
                                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                                                    : completado
                                                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                                                      : 'border border-slate-200 bg-white text-slate-400'
                                            }`}
                                        >
                                            {completado ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <span className={`font-mono text-[10px] ${activo ? 'text-slate-300' : 'text-slate-300'}`}>{paso.numero}</span>
                                            )}
                                            <span>{paso.titulo}</span>
                                        </div>
                                        {indice < PASOS_FLUJO.length - 1 && <span className="hidden text-slate-300 sm:block" aria-hidden="true">›</span>}
                                    </li>
                                );
                            })}
                        </ol>

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                    Lista de Verificación Técnica de Seguridad (ITSE)
                                </h1>
                                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                        <span className="truncate font-semibold text-slate-800">
                                            {autoevaluacion?.nombre_comercio || 'Establecimiento'}
                                        </span>
                                    </span>
                                    <span className="text-slate-300" aria-hidden="true">·</span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Ruler className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                                        {areaM2Declarada !== null ? (
                                            <span>{areaM2Declarada} m² de área declarada</span>
                                        ) : (
                                            <span className="text-slate-500">Área no declarada</span>
                                        )}
                                    </span>
                                </p>
                                <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                                    Declara la situación real de cada condición de tu establecimiento. El simulacro es orientativo y no
                                    reemplaza una inspección técnica oficial.
                                </p>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                {!auth?.user && (
                                    <button
                                        type="button"
                                        onClick={() => setMostrarModalGuardar(true)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        <Save className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>Guardar progreso</span>
                                    </button>
                                )}
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                    Volver al inicio
                                </Link>
                            </div>
                        </div>
                    </header>

                    {/* ============================================== */}
                    {/* Widget de progreso: barra moderna + contador   */}
                    {/* «X de Y verificaciones realizadas». Se ancla  */}
                    {/* para que el avance siga a la vista mientras    */}
                    {/* el ciudadano recorre los criterios.            */}
                    {/* ============================================== */}
                    <div className="sticky top-0 z-30 -mx-4 border-y border-slate-200 bg-white/85 px-4 py-3 shadow-xs backdrop-blur-md sm:-mx-6 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                            <p className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                                Progreso de la verificación
                            </p>
                            <p className="text-xs font-semibold text-slate-600">
                                <span className="text-slate-900">
                                    {respondidosCount} de {criteriosAplicables.length}
                                </span>{' '}
                                verificaciones realizadas
                            </p>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                            <div
                                role="progressbar"
                                aria-valuenow={respondidosCount}
                                aria-valuemin={0}
                                aria-valuemax={criteriosAplicables.length}
                                aria-valuetext={`${respondidosCount} de ${criteriosAplicables.length} verificaciones realizadas`}
                                aria-label="Verificaciones realizadas"
                                className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
                            >
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        porcentajeAvance === 100 ? 'bg-emerald-500' : 'bg-slate-900'
                                    }`}
                                    style={{ width: `${porcentajeAvance}%` }}
                                />
                            </div>
                            <span className="w-12 shrink-0 text-right text-sm font-black tabular-nums text-slate-900">
                                {porcentajeAvance}%
                            </span>
                        </div>
                    </div>

                    {/* ============================================== */}
                    {/* Banner de Autoevaluación Registrada            */}
                    {/* ============================================== */}
                    {esRegistrada && (
                        <div
                            role="status"
                            className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-xs"
                        >
                            <Lock className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
                            <div className="text-sm leading-relaxed">
                                <strong className="font-bold text-emerald-950">Autoevaluación registrada: </strong>
                                Esta autoevaluación está registrada y protegida contra modificaciones
                                {autoevaluacion.registrada_at ? ` el ${autoevaluacion.registrada_at}` : ''}. Sus declaraciones permanecen inalterables. Se encuentra en modo de solo
                                lectura. Para realizar modificaciones debe iniciar una reevaluación preventiva.
                            </div>
                        </div>
                    )}

                    {/* ============================================== */}
                    {/* Mensajes de estado                             */}
                    {/* ============================================== */}
                    {mensajeExito && (
                        <div
                            role="status"
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                <div className="text-sm font-medium">{mensajeExito}</div>
                            </div>
                            {puedeVerResumen && (
                                <Link
                                    href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <span>Ver Resumen de Autoevaluación</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    )}

                    {mensajeError && (
                        <div
                            role="alert"
                            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900"
                        >
                            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                            <div className="text-sm font-medium">{mensajeError}</div>
                        </div>
                    )}

                    {/* ============================================== */}
                    {/* Pestañas de especialidad: una disciplina por     */}
                    {/* píldora, con contador de pendientes o check de  */}
                    {/* completado. Filtran la vista, no los datos.    */}
                    {/* ============================================== */}
                    {areas.length > 1 && (
                        <div className="border-b border-slate-200">
                            <nav aria-label="Especialidades normadas de la verificación" className="-mb-px flex gap-2 overflow-x-auto pb-px">
                                {areas.map((area) => {
                                    const avance = progresoPorArea.find((p) => p.id === area.id);
                                    const IconoEspecialidad = area.icono;
                                    const activa = especialidadVisible?.id === area.id;

                                    return (
                                        <button
                                            key={area.id}
                                            type="button"
                                            onClick={() => setEspecialidadActiva(area.id)}
                                            aria-current={activa ? 'true' : undefined}
                                            className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-3.5 py-2.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                                activa
                                                    ? 'border-slate-300 bg-white text-slate-900 shadow-xs'
                                                    : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800'
                                            }`}
                                        >
                                            <IconoEspecialidad
                                                className={`h-4 w-4 shrink-0 ${activa ? 'text-emerald-600' : 'text-slate-400'}`}
                                                aria-hidden="true"
                                            />
                                            <span className="hidden sm:inline">{area.nombre}</span>
                                            <span className="sm:hidden">{area.nombreCorto}</span>

                                            {avance?.completo ? (
                                                <span
                                                    className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700"
                                                    aria-label="Especialidad completada"
                                                >
                                                    <Check className="h-3 w-3" aria-hidden="true" />
                                                </span>
                                            ) : (
                                                <span
                                                    className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800"
                                                    aria-label={`${avance?.pendientes ?? 0} criterios pendientes`}
                                                >
                                                    {avance?.pendientes ?? 0}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    )}

                    {/* ============================================== */}
                    {/* Información pendiente de aplicabilidad         */}
                    {/* ============================================== */}
                    {criteriosPendientes.length > 0 && (
                        <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5">
                            <button
                                type="button"
                                onClick={() => setMostrarPendientes(!mostrarPendientes)}
                                aria-expanded={mostrarPendientes}
                                className="flex w-full items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Info className="h-5 w-5 text-amber-600 shrink-0" />
                                    <h2 className="text-base font-bold text-amber-900">
                                        Información pendiente para determinar aplicabilidad ({criteriosPendientes.length})
                                    </h2>
                                </div>
                                {mostrarPendientes ? <ChevronUp className="h-4 w-4 text-amber-700 shrink-0" /> : <ChevronDown className="h-4 w-4 text-amber-700 shrink-0" />}
                            </button>

                            {mostrarPendientes && (
                                <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
                                    <p className="text-xs text-amber-800">
                                        Los siguientes criterios requieren datos adicionales sobre las condiciones físicas del local para determinar si corresponden a tu
                                        autoevaluación. No requieren respuesta en este momento.
                                    </p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {criteriosPendientes.map((cp) => (
                                            <div key={cp.codigo} className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-2xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-xs font-bold text-amber-900">{cp.codigo}</span>
                                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Pendiente de dato</span>
                                                </div>
                                                <p className="mt-1.5 text-xs font-bold text-slate-800">{cp.titulo}</p>
                                                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{cp.mensaje || cp.motivo}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ============================================== */}
                    {/* Criterios de la especialidad abierta            */}
                    {/* ============================================== */}
                    <div className="space-y-6">
                        {especialidadVisible && estiloEspecialidad && (
                            <section
                                id={`area-${especialidadVisible.id}`}
                                aria-labelledby={`area-titulo-${especialidadVisible.id}`}
                                className="scroll-mt-28 space-y-4"
                            >
                                <div
                                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${estiloEspecialidad.banner}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${estiloEspecialidad.chipIcono} ${estiloEspecialidad.acento}`}
                                        >
                                            <IconoAreaActivo className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0">
                                            <h2
                                                id={`area-titulo-${especialidadVisible.id}`}
                                                className={`text-base font-black tracking-tight sm:text-lg ${estiloEspecialidad.acento}`}
                                            >
                                                {especialidadVisible.nombre}
                                            </h2>
                                            {estiloEspecialidad.badgeNorma && (
                                                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
                                                    <Scale className="h-3 w-3 shrink-0" aria-hidden="true" />
                                                    <span>Base normativa: {estiloEspecialidad.badgeNorma}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700">
                                            {avanceEspecialidad?.respondidos ?? 0} de {especialidadVisible.criterios.length}
                                        </span>
                                        {(avanceEspecialidad?.pendientes ?? 0) > 0 && !esRegistrada && (
                                            <button
                                                type="button"
                                                onClick={enfocarPrimerPendiente}
                                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                            >
                                                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                                Primer pendiente
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                            {especialidadVisible.criterios.map((criterio, index) => {
                                                const valorSeleccionado = respuestas[criterio.codigo];
                                                const estaGuardado = criteriosGuardados[criterio.codigo];
                                                const estaRespondido = Boolean(valorSeleccionado);
                                                const tieneRecursos =
                                                    criterio.recursos_educativos && criterio.recursos_educativos.length > 0;
                                                const comparativa = COMPARATIVA_CORRECTO_INCORRECTO[criterio.codigo];
                                                const tieneGuiaPedagogica = Boolean(
                                                    criterio.que_observar ||
                                                        criterio.accion_mejora_orientativa ||
                                                        criterio.norma_base ||
                                                        criterio.articulo_referencia ||
                                                        comparativa
                                                );
                                                const referenciaNormativa = criterio.norma_base || criterio.articulo_referencia;

                                                const bordeTarjeta = esRegistrada
                                                    ? 'border-slate-200 bg-white'
                                                    : valorSeleccionado === 'CUMPLE_DECLARADO'
                                                      ? 'border-emerald-300 ring-2 ring-emerald-400/20 bg-emerald-50/5'
                                                      : valorSeleccionado === 'PENDIENTE_ATENDER'
                                                        ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/5'
                                                        : valorSeleccionado === 'POR_REVISAR'
                                                          ? 'border-sky-300 ring-2 ring-sky-400/20 bg-sky-50/5'
                                                          : 'border-slate-200/80 bg-white hover:border-slate-300';

                                                return (
                                                    <article
                                                        key={criterio.codigo}
                                                        id={`criterio-${criterio.codigo}`}
                                                        className={`mb-4 scroll-mt-28 rounded-2xl border p-5 shadow-xs transition-all duration-300 ${bordeTarjeta}`}
                                                    >
                                                        <fieldset className="space-y-4">
                                                            {/* El legend debe ser el primer hijo del fieldset; el título visible va aparte para conservar el orden visual */}
                                                            <legend className="sr-only">{criterio.titulo}</legend>

                                                            {/* Cabecera de la card: código técnico + base normativa + estado */}
                                                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                                                                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                                                    <span className="text-xs font-mono text-slate-400">#{criterio.orden ?? index + 1}</span>
                                                                    <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold tracking-tight text-white">
                                                                        {criterio.codigo}
                                                                    </span>
                                                                    {referenciaNormativa && (
                                                                        <span
                                                                            className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                                                            title={referenciaNormativa}
                                                                        >
                                                                            <Scale className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
                                                                            <span className="truncate">{referenciaNormativa}</span>
                                                                        </span>
                                                                    )}
                                                                    {criterio.categoria && (
                                                                        <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                                            {criterio.categoria}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {estaGuardado ? (
                                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                                                        <Check className="h-3 w-3" aria-hidden="true" /> Guardado
                                                                    </span>
                                                                ) : estaRespondido ? (
                                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" /> Respondido
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                                                                        Sin responder
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Enunciado y pregunta técnica al comerciante */}
                                                            <div>
                                                                <p className="text-base leading-snug font-extrabold text-slate-900">{criterio.titulo}</p>
                                                                <p className="mt-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-sm leading-relaxed font-semibold text-slate-800">
                                                                    {criterio.pregunta_ciudadana}
                                                                </p>
                                                            </div>

                                                            {/* Selector segmentado de las tres declaraciones ciudadanas
                                                                autorizadas. `NO_APLICA` se sigue filtrando aquí y en
                                                                el payload: es una determinación exclusiva del motor. */}
                                                            <div
                                                                role="radiogroup"
                                                                aria-label={`Opciones de respuesta para ${criterio.codigo}`}
                                                                className="grid gap-2 pt-1 sm:grid-cols-3"
                                                            >
                                                                {(criterio.opciones_respuesta || OPCIONES_FALLBACK)
                                                                    .filter((op) => op !== 'NO_APLICA')
                                                                    .map((opcionKey) => {
                                                                        const conf = OPCIONES_ETIQUETAS[opcionKey] || {
                                                                            label: opcionKey,
                                                                            descripcion: '',
                                                                            icono: HelpCircle,
                                                                            borderSelected: 'border-slate-900',
                                                                            bgSelected: 'bg-slate-100',
                                                                            ringSelected: 'ring-2 ring-slate-900/10',
                                                                            textSelected: 'text-slate-900',
                                                                            iconSelected: 'text-slate-900',
                                                                            radioAccent: 'text-slate-900 focus:ring-slate-500',
                                                                        };
                                                                        const IconoOpcion = conf.icono;
                                                                        const esSeleccionado = valorSeleccionado === opcionKey;

                                                                        return (
                                                                            <label
                                                                                key={opcionKey}
                                                                                htmlFor={`${criterio.codigo}-${opcionKey}`}
                                                                                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-150 select-none ${
                                                                                    esRegistrada ? 'cursor-default opacity-90' : 'cursor-pointer'
                                                                                } ${
                                                                                    esSeleccionado
                                                                                        ? `${conf.borderSelected} ${conf.bgSelected} ${conf.ringSelected} shadow-xs scale-[1.01]`
                                                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="radio"
                                                                                    id={`${criterio.codigo}-${opcionKey}`}
                                                                                    name={`criterio-${criterio.codigo}`}
                                                                                    value={opcionKey}
                                                                                    checked={esSeleccionado}
                                                                                    disabled={esRegistrada || guardandoAvance || guardandoContinuar}
                                                                                    onChange={() => seleccionarRespuesta(criterio.codigo, opcionKey)}
                                                                                    className={`mt-0.5 h-4 w-4 shrink-0 border-slate-300 ${conf.radioAccent} disabled:opacity-60`}
                                                                                />
                                                                                <span className="min-w-0">
                                                                                    <span className="flex items-center gap-1.5">
                                                                                        <span
                                                                                            className={`text-xs font-bold ${esSeleccionado ? conf.textSelected : 'text-slate-700'}`}
                                                                                        >
                                                                                            {conf.label}
                                                                                        </span>
                                                                                        <IconoOpcion
                                                                                            className={`h-3.5 w-3.5 shrink-0 ${esSeleccionado ? conf.iconSelected : 'text-slate-300'}`}
                                                                                            aria-hidden="true"
                                                                                        />
                                                                                    </span>
                                                                                    <span className="mt-1 block text-[11px] leading-tight text-slate-500">
                                                                                        {conf.descripcion}
                                                                                    </span>
                                                                                </span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                            </div>

                                                            {/* Contexto paramétrico: se muestra solo cuando el dato del
                                                                paso 1 realmente existe. Sin dato declarado el bloque no se
                                                                renderiza, porque calcular sobre 0 afirmaría una dotación que
                                                                nadie declaró. */}
                                                            {criterio.codigo === 'CRIT-01' && mostrarDotacionExtintores && (
                                                                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                                                                    <div className="flex items-center gap-1.5 font-black">
                                                                        <Ruler className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                                        <span>Contexto declarado: dotación de extintores</span>
                                                                    </div>
                                                                    <p className="mt-1.5 text-sm font-black">
                                                                        {extintoresSugeridos}{' '}
                                                                        {extintoresSugeridos === 1 ? 'extintor' : 'extintores'} como mínimo
                                                                        sugerido
                                                                    </p>
                                                                    <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/80">
                                                                        Cálculo orientativo: ceil({areaM2Num.toFixed(2)} m² / 60) = {extintoresMinimos}
                                                                        {extintoresPorPisos !== null && `; por pisos = ${extintoresPorPisos}`}. Recorrido máximo
                                                                        ≤ 15 m horizontales y altura máxima 1.50 m al soporte (RNE A.130).
                                                                    </p>
                                                                    <p
                                                                        className={`mt-1.5 text-[11px] leading-relaxed ${
                                                                            tieneEquiposFritura ? 'font-semibold text-amber-800' : 'text-emerald-900/80'
                                                                        }`}
                                                                    >
                                                                        {tieneEquiposFritura === true
                                                                            ? 'Con freidoras o cocina comercial declaradas se requiere extintor Tipo K (acetato de potasio).'
                                                                            : tieneEquiposFritura === false
                                                                              ? 'Tipo K no requerido con la declaración actual.'
                                                                              : 'Equipamiento de fritura no declarado: el Tipo K no puede descartarse.'}
                                                                    </p>
                                                                    <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-900/60">
                                                                        Orientativo: no sustituye la verificación de carga y riesgo por el especialista.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {criterio.codigo === 'CRIT-04' && mostrarExigenciasAforo && (
                                                                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                                                                    <div className="flex items-center gap-1.5 font-black">
                                                                        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                                        <span>Contexto declarado: exigencias por aforo</span>
                                                                    </div>
                                                                    <p className="mt-1.5 text-sm font-black">
                                                                        {aforoNum} {aforoNum === 1 ? 'persona' : 'personas'} declaradas
                                                                    </p>

                                                                    {mostrarAlertaAforo50 && (
                                                                        <p className="mt-1.5 text-[11px] leading-relaxed">
                                                                            Por superar las 50 personas, la puerta de salida debe abrir
                                                                            obligatoriamente hacia el exterior como flujo de evacuación (RNE A.010
                                                                            Art. 35.d / RNE A.130 Art. 8).
                                                                        </p>
                                                                    )}
                                                                    {mostrarAlertaAforo100 && (
                                                                        <p className="mt-1.5 text-[11px] leading-relaxed font-semibold text-rose-800">
                                                                            Por superar las 100 personas es obligatoria la barra antipánico
                                                                            (RNE A.010 / RNE A.130).
                                                                        </p>
                                                                    )}
                                                                    {!mostrarAlertaAforo50 && (
                                                                        <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-900/80">
                                                                            Con aforo ≤ 50 personas no se activa la exigencia paramétrica
                                                                            señalada; igualmente debe garantizarse la salida expedita y sin trabas.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Botones de apoyo pedagógico y material orientativo */}
                                                            {(tieneGuiaPedagogica || tieneRecursos) && (
                                                                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                                                    {tieneGuiaPedagogica && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setModalGuiaPedagogica({
                                                                                    isOpen: true,
                                                                                    codigo: criterio.codigo,
                                                                                    titulo: criterio.titulo,
                                                                                    explicacionCotidiana: comparativa?.explicacionCotidiana,
                                                                                    queObservar: criterio.que_observar || undefined,
                                                                                    correcto: comparativa?.correcto,
                                                                                    incorrecto: comparativa?.incorrecto,
                                                                                    normaBase: criterio.norma_base,
                                                                                    articuloReferencia: criterio.articulo_referencia,
                                                                                })
                                                                            }
                                                                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                                                                        >
                                                                            <Lightbulb className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                                                                            <span>💡 Ayuda visual: ¿Cómo revisar esto?</span>
                                                                        </button>
                                                                    )}

                                                                    {tieneRecursos && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setModalRecurso({
                                                                                    isOpen: true,
                                                                                    recursos: criterio.recursos_educativos || [],
                                                                                    codigo: criterio.codigo,
                                                                                    titulo: criterio.titulo,
                                                                                })
                                                                            }
                                                                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
                                                                        >
                                                                            <BookOpen className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                                                                            <span>
                                                                                Material orientativo{' '}
                                                                                {criterio.recursos_educativos && criterio.recursos_educativos.length > 1
                                                                                    ? `(${criterio.recursos_educativos.length})`
                                                                                    : ''}
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                    </fieldset>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                    </div>

                    {/* ============================================== */}
                    {/* Criterios no aplicables (decisión del sistema) */}
                    {/* ============================================== */}
                    {criteriosNoAplican.length > 0 && (
                        <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                            <button
                                type="button"
                                onClick={() => setMostrarNoAplican(!mostrarNoAplican)}
                                aria-expanded={mostrarNoAplican}
                                className="flex w-full items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-xl"
                            >
                                <div className="flex items-center gap-2.5">
                                    <ShieldAlert className="h-5 w-5 text-slate-400 shrink-0" />
                                    <h2 className="text-base font-bold text-slate-800">
                                        Condiciones que el sistema determinó como no aplicables ({criteriosNoAplican.length})
                                    </h2>
                                </div>
                                {mostrarNoAplican ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />}
                            </button>

                            {mostrarNoAplican && (
                                <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                                    <p className="text-xs text-slate-500">
                                        El motor de aplicabilidad descartó estas condiciones a partir de lo que declaraste en el paso 1. La decisión es del sistema, no tuya: no son
                                        seleccionables ni requieren acción ciudadana.
                                    </p>
                                    <div className="space-y-2">
                                        {criteriosNoAplican.map((cna) => (
                                            <div key={cna.codigo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-800">{cna.codigo}</span>
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                                        No aplica
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-sm font-bold text-slate-800">{cna.titulo}</p>
                                                <p className="mt-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                                    <strong className="text-slate-700">Motivo del sistema: </strong>
                                                    {cna.motivo}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* ================================================== */}
                {/* Panel lateral: resumen de hallazgos en vivo       */}
                {/* Solo escritorio; en móvil la barra inferior hace */}
                {/* exactamente el mismo trabajo.                      */}
                {/* ================================================== */}
                <aside aria-label="Resumen de hallazgos en vivo" className="hidden lg:col-span-4 lg:block">
                    <div className="sticky top-24 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <ShieldAlert className="h-4 w-4" />
                            </span>
                            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                                Resumen de hallazgos en vivo
                            </h2>
                        </div>

                        <div>
                            <p className="flex items-baseline gap-2">
                                <span
                                    className={`text-4xl font-black tracking-tight ${
                                        faltasDetectadas > 0 ? 'text-rose-700' : 'text-emerald-700'
                                    }`}
                                >
                                    {faltasDetectadas}
                                </span>
                                <span className="text-sm font-bold text-slate-700">
                                    {faltasDetectadas === 1 ? 'falta detectada' : 'faltas detectadas'}
                                </span>
                            </p>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                Se actualiza con cada declaración que marques, sin guardar nada.
                            </p>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between text-[11px]">
                                <span className="font-bold uppercase tracking-wider text-slate-500">Avance</span>
                                <span className="font-black text-slate-900">
                                    {respondidosCount} de {criteriosAplicables.length}
                                </span>
                            </div>
                            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className={`h-full rounded-full ${porcentajeAvance === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                    style={{ width: `${porcentajeAvance}%` }}
                                />
                            </div>
                        </div>

                        {faltasDetectadas === 0 ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                                <p className="flex items-start gap-2 text-xs font-medium leading-relaxed text-emerald-900">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                    <span>
                                        Aún no hay faltas registradas. Tu local cumple lo declarado hasta el momento.
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
                                {hallazgos.map((hallazgo) => (
                                    <li
                                        key={hallazgo.codigo}
                                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
                                    >
                                        <span className="font-mono text-[10px] font-bold text-rose-500">
                                            {hallazgo.codigo}
                                        </span>
                                        <span className="mt-0.5 block text-xs font-semibold leading-snug">
                                            {hallazgo.titulo}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* El panel lateral es solo informativo: las acciones de
                            guardado y cierre viven una sola vez en la barra inferior. */}
                        <p className="border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500">
                            Cuando termines las {criteriosAplicables.length} condiciones, podrás pausar y guardar tu
                            avance o pasar al resumen con el diagnóstico final.
                        </p>
                    </div>
                </aside>
            </div>

            {/* ================================================== */}
            {/* Cierre de flujo: pausa/guardado + avance al resumen */}
            {/* Unica instancia de las acciones, visible en todos los tamaños. */}
            {/* ================================================== */}
            <div className="sticky bottom-0 z-30 mt-6 border-t border-slate-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <ClipboardList className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span className="font-bold text-slate-900">
                            {respondidosCount} de {criteriosAplicables.length} verificaciones realizadas
                        </span>
                        {!todosRespondidos && !esRegistrada && (
                            <span className="text-amber-700">
                                (faltan {criteriosAplicables.length - respondidosCount})
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
                        {!esRegistrada && (
                            <button
                                type="button"
                                onClick={handleGuardarAvance}
                                disabled={guardandoAvance || guardandoContinuar || respondidosCount === 0}
                                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                            >
                                {guardandoAvance ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                ) : (
                                    <Save className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                )}
                                <span>Pausar y guardar progreso</span>
                            </button>
                        )}

                        {esRegistrada ? (
                            <Link
                                href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <span>Ver Resumen y Diagnóstico Final</span>
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={handleContinuarAlResumen}
                                disabled={guardandoAvance || guardandoContinuar || !todosRespondidos}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                    todosRespondidos
                                        ? 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500'
                                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                                }`}
                            >
                                {guardandoContinuar ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                        <span>Generando diagnóstico...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ver Resumen y Diagnóstico Final</span>
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ModalGuardarProgreso
                isOpen={mostrarModalGuardar}
                onClose={() => setMostrarModalGuardar(false)}
                uuid={autoevaluacion?.uuid}
                establecimiento={autoevaluacion?.nombre_comercio}
                destino="checklist"
            />

            <RecursoEducativoModal
                isOpen={modalRecurso.isOpen}
                onClose={() => setModalRecurso({ isOpen: false, recursos: [] })}
                recursos={modalRecurso.recursos}
                criterioCodigo={modalRecurso.codigo}
                criterioTitulo={modalRecurso.titulo}
            />

            <GuiaPedagogicaModal
                isOpen={modalGuiaPedagogica.isOpen}
                onClose={() => setModalGuiaPedagogica((prev) => ({ ...prev, isOpen: false }))}
                codigo={modalGuiaPedagogica.codigo}
                titulo={modalGuiaPedagogica.titulo}
                explicacionCotidiana={modalGuiaPedagogica.explicacionCotidiana}
                queObservar={modalGuiaPedagogica.queObservar}
                correcto={modalGuiaPedagogica.correcto}
                incorrecto={modalGuiaPedagogica.incorrecto}
                normaBase={modalGuiaPedagogica.normaBase}
                articuloReferencia={modalGuiaPedagogica.articuloReferencia}
            />
        </>
    );
}
