import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import {
    ClipboardList,
    CheckCircle2,
    Clock,
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
    FileEdit,
    Lightbulb,
    Scale,
} from 'lucide-react';
import type { ChecklistAutoevaluacion, ChecklistProps, CriterioEvaluable } from '@/types/contrato';

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
 * `NO_APLICA` es una determinación exclusiva del sistema y jamás se ofrece aquí.
 */
const OPCIONES_ETIQUETAS: Record<string, OpcionConfig> = {
    CUMPLE_DECLARADO: {
        label: 'Cumple según lo declarado',
        descripcion: 'El establecimiento cuenta con esta condición según su propia declaración.',
        icono: CheckCircle2,
        borderSelected: 'border-emerald-500',
        bgSelected: 'bg-emerald-50/50',
        ringSelected: 'ring-2 ring-emerald-500/20',
        textSelected: 'text-emerald-950 font-medium',
        iconSelected: 'text-emerald-600',
        radioAccent: 'text-emerald-600 focus:ring-emerald-500',
    },
    PENDIENTE_ATENDER: {
        label: 'Pendiente de atender',
        descripcion: 'Requiere corrección, adquisición o mantenimiento antes de una inspección oficial.',
        icono: Clock,
        borderSelected: 'border-amber-500',
        bgSelected: 'bg-amber-50/50',
        ringSelected: 'ring-2 ring-amber-500/20',
        textSelected: 'text-amber-950 font-medium',
        iconSelected: 'text-amber-600',
        radioAccent: 'text-amber-600 focus:ring-amber-500',
    },
    POR_REVISAR: {
        label: 'Por revisar',
        descripcion: 'Falta comprobar o consultar con un técnico especializado.',
        icono: HelpCircle,
        borderSelected: 'border-sky-500',
        bgSelected: 'bg-sky-50/50',
        ringSelected: 'ring-2 ring-sky-500/20',
        textSelected: 'text-sky-950 font-medium',
        iconSelected: 'text-sky-600',
        radioAccent: 'text-sky-600 focus:ring-sky-500',
    },
};

const OPCIONES_FALLBACK = ['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'];

interface AreaNormativa {
    id: string;
    nombre: string;
    icono: React.ComponentType<{ className?: string }>;
    criterios: CriterioEvaluable[];
}

function agruparCriteriosPorArea(criterios: CriterioEvaluable[]): AreaNormativa[] {
    const definiciones = [
        {
            id: 'incendios',
            nombre: 'Protección Contra Incendios',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('incendio'),
        },
        {
            id: 'evacuacion',
            nombre: 'Medios de Evacuación y Señalización',
            icono: Footprints,
            match: (cat: string) =>
                (cat.toLowerCase().includes('evacuación') || cat.toLowerCase().includes('señalización')) &&
                !cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'electricas',
            nombre: 'Instalaciones Eléctricas',
            icono: Zap,
            match: (cat: string) => cat.toLowerCase().includes('eléctric'),
        },
        {
            id: 'gas',
            nombre: 'Instalaciones de Gas',
            icono: Flame,
            match: (cat: string) => cat.toLowerCase().includes('gas') || cat.toLowerCase().includes('glp'),
        },
        {
            id: 'estructuras',
            nombre: 'Seguridad Estructural y Prevención Sísmica',
            icono: Shield,
            match: (cat: string) =>
                cat.toLowerCase().includes('estructur') ||
                cat.toLowerCase().includes('sísmic') ||
                cat.toLowerCase().includes('accesibilidad') ||
                cat.toLowerCase().includes('almacenamiento'),
        },
    ];

    const areas: AreaNormativa[] = definiciones.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        icono: d.icono,
        criterios: [],
    }));

    for (const c of criterios) {
        const cat = c.categoria || '';
        const area = areas.find((a) => {
            const def = definiciones.find((d) => d.id === a.id);
            return def?.match(cat);
        });

        if (area) {
            area.criterios.push(c);
        } else if (areas.length > 0) {
            areas[0].criterios.push(c);
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
    correcto: string[];
    incorrecto: string[];
}

const COMPARATIVA_CORRECTO_INCORRECTO: Record<string, GuiaComparativa> = {
    'CRIT-01': {
        correcto: [
            'Extintor visible, accesible y sin mercadería ni cajas delante.',
            'Aguja del manómetro dentro de la franja verde operable.',
            'Tarjeta de mantenimiento con fecha menor a 1 año.',
            'Instalado a una altura máxima de 1.50 m del piso.',
        ],
        incorrecto: [
            'Extintor tapado, bloqueado o dentro de un mueble cerrado.',
            'Manómetro en rojo, descargado o sin lectura visible.',
            'Tarjeta vencida, borrada o inexistente.',
            'Sin extintor, o con uno de tipo o carga inadequate al riesgo.',
        ],
    },
    'CRIT-03': {
        correcto: [
            'Pasadizos y camino hacia la salida continuos y despejados.',
            'Ancho de paso libre y suficiente para el número de personas.',
            'Sin fardos, cajas o mobiliario que estrechen la vía.',
            'Libre también el recorrido hasta la puerta de evacuación.',
        ],
        incorrecto: [
            'Cajas, fardos o muebles que reducen el ancho de paso.',
            'Muebles o mercadería almacenados sobre la vía de evacuación.',
            'Pasadizo cerrado con candado, reja o puerta trabada.',
            'Tramo sin señalización visible que identifique la salida.',
        ],
    },
    'CRIT-05': {
        correcto: [
            'Constancia o protocolo de medición con fecha no mayor a 1 año.',
            'Valor de resistencia consignado igual o menor a 25 Ohmios.',
            'Emitido por profesional calificado o colegiado.',
            'Documento disponible para mostrar ante una verificación oficial.',
        ],
        incorrecto: [
            'Sin constancia, o con fecha mayor a 1 año.',
            'Resistencia declarada mayor a 25 Ohmios.',
            'Medición tomada por persona no calificada.',
            'Pozo de tierra inexistente o sin conductor de protección conectado.',
        ],
    },
    'CRIT-06': {
        correcto: [
            'Mandil o contratapa que cubre cables y barras internas.',
            'Interruptores rotulados con el circuito que protegen.',
            'Diferencial con botón de prueba "T" en circuitos de tomacorrientes.',
            'Tablero cerrado, sin partes vivas expuestas al tacto.',
        ],
        incorrecto: [
            'Tablero abierto o con cables internos a la vista.',
            'Interruptores sin rótulo o con rótulos ilegibles.',
            'Ausencia de diferencial o sin botón de prueba "T".',
            'Cables empalmados con cinta de aislar o placas sueltas.',
        ],
    },
};

const ETIQUETA_COMPARATIVA = {
    correcto: 'Condición reglamentaria esperada',
    incorrecto: 'Falta que motiva observación o cierre temporal',
} as const;

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
    const { auth } = usePage().props as { auth?: { user: any | null } };
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

    // Agrupación dinámica por 5 áreas normativas naturales
    const areas = useMemo(() => agruparCriteriosPorArea(criteriosAplicables), [criteriosAplicables]);

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
    const [notas, setNotas] = useState<Record<string, string>>(() => {
        const inicial: Record<string, string> = {};
        for (const c of criteriosAplicables) {
            if (c.notas) {
                inicial[c.codigo] = c.notas;
            }
        }
        return inicial;
    });

    // Visibilidad de los campos de notas
    const [mostrarNotas, setMostrarNotas] = useState<Record<string, boolean>>(() => {
        const inicial: Record<string, boolean> = {};
        for (const c of criteriosAplicables) {
            if (c.notas) {
                inicial[c.codigo] = true;
            }
        }
        return inicial;
    });

    /**
     * Visibilidad del bloque pedagógico "¿Por qué me piden esto?".
     * Se abre sola cuando el ciudadano declara un pendiente, porque ahí la
     * orientación normativa es la que le sirve para actuar.
     */
    const [mostrarGuia, setMostrarGuia] = useState<Record<string, boolean>>(() => {
        const inicial: Record<string, boolean> = {};
        for (const c of criteriosAplicables) {
            if (c.estado === 'PENDIENTE_ATENDER' || c.estado === 'POR_REVISAR') {
                inicial[c.codigo] = true;
            }
        }
        return inicial;
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

        // Si selecciona PENDIENTE_ATENDER o POR_REVISAR, abrir automáticamente el campo de notas si aún no tiene
        if (estado === 'PENDIENTE_ATENDER' || estado === 'POR_REVISAR') {
            setMostrarNotas((prev) => ({ ...prev, [codigo]: true }));
            setMostrarGuia((prev) => ({ ...prev, [codigo]: true }));
        }

        setMensajeExito(null);
        setMensajeError(null);
    };

    // Acción Secundaria: Guardar Avance (persiste desde 1 respuesta, mantiene INICIADA)
    const handleGuardarAvance = async () => {
        if (esRegistrada) return;

        const respuestasAEnviar = Object.entries(respuestas)
            .filter(([_, estado]) => Boolean(estado))
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
                    {/* Cabecera institucional                           */}
                    {/* ============================================== */}
                    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                        <ol
                            aria-label="Flujo de autoevaluación: 1. Calcular riesgo, 2. Simulacro en vivo, 3. Veredicto"
                            className="flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-3 mb-6"
                        >
                            {PASOS_FLUJO.map((paso, indice) => {
                                const activo = paso.estado === 'activo';
                                const completado = paso.estado === 'completado';
                                return (
                                    <li key={paso.numero} className="flex items-center gap-2 sm:gap-3">
                                        <div
                                            aria-current={activo ? 'step' : undefined}
                                            className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition ${
                                                activo
                                                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                                                    : completado
                                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                      : 'bg-white border border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {completado ? (
                                                <Check className="w-3 h-3" />
                                            ) : (
                                                <span className={`font-mono text-[10px] ${activo ? 'text-emerald-100' : 'text-slate-300'}`}>{paso.numero}</span>
                                            )}
                                            <span>{paso.titulo}</span>
                                        </div>
                                        {indice < PASOS_FLUJO.length - 1 && <span className="hidden sm:block text-slate-300" aria-hidden="true">›</span>}
                                    </li>
                                );
                            })}
                        </ol>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <span className="font-medium text-slate-700">{autoevaluacion?.nombre_comercio || 'Establecimiento'}</span>
                                </div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Simulacro en vivo</h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:self-start">
                                {!auth?.user && (
                                    <button
                                        type="button"
                                        onClick={() => setMostrarModalGuardar(true)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        <span>Guardar y vincular a mi cuenta</span>
                                    </button>
                                )}
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Volver al inicio
                                </Link>
                            </div>
                        </div>

                        <p className="mt-4 text-sm leading-relaxed text-slate-600 border-t border-slate-100 pt-4">
                            Declara la situación real de cada condición de tu establecimiento. El simulacro es orientativo y no reemplaza una inspección técnica oficial.
                        </p>

                        {/* Progreso descriptivo de completitud */}
                        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm text-slate-700 font-semibold">
                                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                                    <span>Avance de autoevaluación</span>
                                </div>
                                <div className="text-sm font-bold text-slate-900">
                                    {respondidosCount} de {criteriosAplicables.length} criterios respondidos
                                </div>
                            </div>

                            <div
                                role="progressbar"
                                aria-valuenow={respondidosCount}
                                aria-valuemin={0}
                                aria-valuemax={criteriosAplicables.length}
                                aria-label="Criterios respondidos"
                                className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
                            >
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${porcentajeAvance}%` }}
                                />
                            </div>
                        </div>
                    </header>

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
                    {/* Acceso rápido por áreas normativas             */}
                    {/* ============================================== */}
                    {areas.length > 1 && (
                        <nav
                            aria-label="Navegación por áreas temáticas"
                            className="flex items-center gap-2 overflow-x-auto pb-1 text-xs"
                        >
                            <span className="text-slate-500 font-semibold shrink-0">Áreas:</span>
                            {areas.map((area) => {
                                const respEnArea = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
                                const AreaIcono = area.icono;
                                return (
                                    <a
                                        key={area.id}
                                        href={`#area-${area.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shrink-0 transition-colors shadow-2xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                    >
                                        <AreaIcono className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{area.nombre}</span>
                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600">
                                            {respEnArea}/{area.criterios.length}
                                        </span>
                                    </a>
                                );
                            })}
                        </nav>
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
                    {/* Criterios aplicables por área normativa        */}
                    {/* ============================================== */}
                    <div className="space-y-9">
                        {areas.map((area) => {
                            const respEnArea = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
                            const AreaIcono = area.icono;
                            const estilo = CONFIG_AREA[area.id] ?? CONFIG_AREA_POR_DEFECTO;

                            return (
                                <section key={area.id} id={`area-${area.id}`} className="space-y-4 scroll-mt-20">
                                    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${estilo.banner}`}>
                                        <div className="flex items-start gap-3 sm:items-center">
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${estilo.chipIcono} ${estilo.acento}`}>
                                                <AreaIcono className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <h2 className={`text-base font-extrabold tracking-tight sm:text-lg ${estilo.acento}`}>{area.nombre}</h2>
                                                {estilo.badgeNorma && (
                                                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                        <Scale className="h-3 w-3 shrink-0" />
                                                        <span>Base normativa: {estilo.badgeNorma}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="self-start whitespace-nowrap rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 sm:self-auto">
                                            {respEnArea} de {area.criterios.length} respondidos
                                        </div>
                                    </div>

                                    <div className="space-y-4 sm:space-y-5">
                                        {area.criterios.map((criterio, index) => {
                                            const valorSeleccionado = respuestas[criterio.codigo];
                                            const estaGuardado = criteriosGuardados[criterio.codigo];
                                            const estaRespondido = Boolean(valorSeleccionado);
                                            const esPendienteCiudadano = valorSeleccionado === 'PENDIENTE_ATENDER' || valorSeleccionado === 'POR_REVISAR';
                                            const tieneRecursos = criterio.recursos_educativos && criterio.recursos_educativos.length > 0;
                                            const guiaAbierta = Boolean(mostrarGuia[criterio.codigo]);
                                             const tieneGuiaPedagogica = Boolean(
                                                 criterio.que_observar || criterio.accion_mejora_orientativa || criterio.norma_base || criterio.articulo_referencia
                                             );
                                             const comparativa = COMPARATIVA_CORRECTO_INCORRECTO[criterio.codigo];

                                             const { area_m2, pisos, aforo } = autoevaluacion as ChecklistAutoevaluacion & {
                                                 area_m2?: number | null;
                                                 pisos?: number | null;
                                                 aforo?: number | null;
                                             };

                                             const areaM2Num = typeof area_m2 === 'number' ? area_m2 : Number(area_m2) || 0;
                                             const pisosNum = typeof pisos === 'number' ? pisos : Number(pisos) || 0;
                                             const aforoNum = typeof aforo === 'number' ? aforo : Number(aforo) || 0;

                                             const extintoresMinimos = areaM2Num > 0
                                                 ? Math.ceil(areaM2Num / 60)
                                                 : 0;
                                             const extintoresPorPisos = pisosNum > 0 ? pisosNum : 0;
                                             const extintoresSugeridos = Math.max(
                                                 1,
                                                 Math.max(extintoresMinimos, extintoresPorPisos)
                                             );

                                             const mostrarAlertaAforo50 = aforoNum > 50;
                                             const mostrarAlertaAforo100 = aforoNum > 100;
                                             const tieneEquiposFritura =
                                                 (autoevaluacion as ChecklistAutoevaluacion & {
                                                     tiene_equipos_fritura?: boolean | null;
                                                     caracteristicas_declaradas?: { tiene_equipos_fritura?: boolean | null };
                                                 })?.tiene_equipos_fritura ??
                                                 (autoevaluacion as ChecklistAutoevaluacion & {
                                                     caracteristicas_declaradas?: { tiene_equipos_fritura?: boolean | null };
                                                 })?.caracteristicas_declaradas?.tiene_equipos_fritura ??
                                                 null;

                                            const bordeTarjeta = esRegistrada
                                                ? 'border-slate-200'
                                                : esPendienteCiudadano
                                                  ? 'border-amber-300'
                                                  : valorSeleccionado === 'CUMPLE_DECLARADO'
                                                    ? 'border-emerald-300'
                                                    : estaRespondido
                                                      ? 'border-slate-300'
                                                      : 'border-slate-200';

                                            return (
                                                <article
                                                    key={criterio.codigo}
                                                    id={`criterio-${criterio.codigo}`}
                                                    className={`scroll-mt-24 rounded-3xl border border-l-4 ${estilo.bordeCriterio} bg-white p-4 sm:p-6 shadow-xs transition-colors ${bordeTarjeta}`}
                                                >
                                                    <fieldset className="space-y-4">
                                                        {/* El legend debe ser el primer hijo del fieldset; el título visible va aparte para conservar el orden visual */}
                                                        <legend className="sr-only">{criterio.titulo}</legend>

                                                        {/* Cabecera: identificadores y estado */}
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">{criterio.codigo}</span>
                                                                {criterio.tipo_criterio && (
                                                                    <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                                                                        {criterio.tipo_criterio}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-slate-400 font-mono">#{criterio.orden ?? index + 1}</span>
                                                            </div>

                                                            {estaGuardado ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                                                    <Check className="h-3 w-3" /> Guardado
                                                                </span>
                                                            ) : estaRespondido ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200">
                                                                    Sin guardar
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 border border-slate-200">
                                                                    Sin responder
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Título y pregunta ciudadana */}
                                                        <div>
                                                            <p className="text-base font-extrabold text-slate-900 leading-snug">{criterio.titulo}</p>
                                                            <p className="mt-2.5 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl leading-relaxed">
                                                                {criterio.pregunta_ciudadana}
                                                            </p>
                                                        </div>

                                                        {/* Selector de las tres declaraciones ciudadanas autorizadas */}
                                                        <div
                                                            role="radiogroup"
                                                            aria-label={`Opciones de respuesta para ${criterio.codigo}`}
                                                            className="grid gap-2.5 pt-1 sm:grid-cols-3"
                                                        >
                                                            {(criterio.opciones_respuesta || OPCIONES_FALLBACK)
                                                                .filter((op) => op !== 'NO_APLICA')
                                                                .map((opcionKey) => {
                                                                    const conf = OPCIONES_ETIQUETAS[opcionKey] || {
                                                                        label: opcionKey,
                                                                        descripcion: '',
                                                                        icono: HelpCircle,
                                                                        borderSelected: 'border-slate-600',
                                                                        bgSelected: 'bg-slate-50',
                                                                        ringSelected: 'ring-1 ring-slate-600',
                                                                        textSelected: 'text-slate-900',
                                                                        iconSelected: 'text-slate-600',
                                                                        radioAccent: 'text-slate-600 focus:ring-slate-500',
                                                                    };
                                                                    const Icono = conf.icono;
                                                                    const esSeleccionado = valorSeleccionado === opcionKey;

                                                                    return (
                                                                        <label
                                                                            key={opcionKey}
                                                                            htmlFor={`${criterio.codigo}-${opcionKey}`}
                                                                             className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 select-none ${
                                                                                 esRegistrada ? 'cursor-default opacity-90' : 'cursor-pointer'
                                                                             } ${
                                                                                 esSeleccionado
                                                                                     ? `${conf.borderSelected} ${conf.bgSelected} ${conf.ringSelected} shadow-xs`
                                                                                     : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
                                                                             }`}
                                                                             >
                                                                             <div className="flex items-center justify-between gap-2">
                                                                                 <div className="flex items-center gap-2">
                                                                                     <input
                                                                                         type="radio"
                                                                                         id={`${criterio.codigo}-${opcionKey}`}
                                                                                         name={`criterio-${criterio.codigo}`}
                                                                                         value={opcionKey}
                                                                                         checked={esSeleccionado}
                                                                                         disabled={esRegistrada || guardandoAvance || guardandoContinuar}
                                                                                         onChange={() => seleccionarRespuesta(criterio.codigo, opcionKey)}
                                                                                         className={`h-4 w-4 border-slate-300 ${conf.radioAccent} disabled:opacity-60`}
                                                                                     />
                                                                                     <span className={`text-xs font-bold ${esSeleccionado ? conf.textSelected : 'text-slate-700'}`}>{conf.label}</span>
                                                                                 </div>
                                                                                 <Icono className={`h-4 w-4 shrink-0 ${esSeleccionado ? conf.iconSelected : 'text-slate-300'}`} />
                                                                             </div>
                                                                             <span className="mt-2 text-[11px] text-slate-500 leading-tight">{conf.descripcion}</span>
                                                                         </label>
                                                                    );
                                                                })}
                                                        </div>

                                                        {/* Micro-learning: el porqué de la pregunta */}
                                                        {tieneGuiaPedagogica && (
                                                            <div className="pt-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMostrarGuia((prev) => ({ ...prev, [criterio.codigo]: !prev[criterio.codigo] }))}
                                                                    aria-expanded={guiaAbierta}
                                                                    aria-controls={`guia-${criterio.codigo}`}
                                                                    className={`inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                                                        esPendienteCiudadano
                                                                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                                    }`}
                                                                >
                                                                    <span className="inline-flex items-center gap-2">
                                                                        <Lightbulb className="h-4 w-4 shrink-0" />
                                                                        <span>¿Por qué me piden esto?</span>
                                                                    </span>
                                                                    {guiaAbierta ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                                                                </button>

                                                                {guiaAbierta && (
                                                                    <div
                                                                        id={`guia-${criterio.codigo}`}
                                                                        className="mt-2.5 overflow-hidden rounded-2xl bg-emerald-50/60 border border-emerald-200 p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 ease-out"
                                                                    >
                                                                        {criterio.que_observar && (
                                                                            <div>
                                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                                                                                    <ClipboardList className="h-3.5 w-3.5" />
                                                                                    <span>Qué observar</span>
                                                                                </div>
                                                                                <p className="text-xs text-slate-700 leading-relaxed">{criterio.que_observar}</p>
                                                                            </div>
                                                                        )}

                                                                        {criterio.accion_mejora_orientativa && (
                                                                            <div
                                                                                className={`rounded-xl border p-3 ${
                                                                                    esPendienteCiudadano ? 'bg-amber-50 border-amber-200' : 'bg-white border-emerald-100'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                                                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                                                    <span>Acción orientativa recomendada</span>
                                                                                </div>
                                                                                <p className="text-xs text-slate-700 leading-relaxed">{criterio.accion_mejora_orientativa}</p>
                                                                            </div>
                                                                        )}

                                                                        {(criterio.norma_base || criterio.articulo_referencia) && (
                                                                            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/70">
                                                                                <Scale className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-700" />
                                                                                <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                                                                                    Base normativa: {criterio.norma_base}
                                                                                    {criterio.articulo_referencia ? ` (${criterio.articulo_referencia})` : ''}
                                                                                </p>
                                                                            </div>
                                                                        )}

                                                                         {(comparativa || criterio.codigo === 'CRIT-01' || criterio.codigo === 'CRIT-04') && (
                                                                             <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                                                                                 {comparativa && (
                                                                                     <>
                                                                                         <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-3.5">
                                                                                             <div className="flex items-center gap-2 text-emerald-800">
                                                                                                 <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                                                                                 <span className="text-xs font-black">Correcto</span>
                                                                                             </div>
                                                                                             <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80">
                                                                                                 {ETIQUETA_COMPARATIVA.correcto}
                                                                                             </p>
                                                                                             <ul className="mt-2.5 space-y-1.5">
                                                                                                 {comparativa.correcto.map((punto) => (
                                                                                                     <li key={punto} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-700">
                                                                                                         <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                                                                                                         <span>{punto}</span>
                                                                                                     </li>
                                                                                                 ))}
                                                                                             </ul>
                                                                                         </div>

                                                                                         <div className="rounded-2xl border border-rose-300 bg-rose-50/50 p-3.5">
                                                                                             <div className="flex items-center gap-2 text-rose-800">
                                                                                                 <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                                                                                                 <span className="text-xs font-black">Incorrecto</span>
                                                                                             </div>
                                                                                             <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700/80">
                                                                                                 {ETIQUETA_COMPARATIVA.incorrecto}
                                                                                             </p>
                                                                                             <ul className="mt-2.5 space-y-1.5">
                                                                                                 {comparativa.incorrecto.map((punto) => (
                                                                                                     <li key={punto} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-700">
                                                                                                         <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                                                                                                         <span>{punto}</span>
                                                                                                     </li>
                                                                                                 ))}
                                                                                             </ul>
                                                                                         </div>
                                                                                     </>
                                                                                 )}

                                                                                 {criterio.codigo === 'CRIT-01' && (
                                                                                     <div className="rounded-2xl border border-blue-300 bg-blue-50/60 p-3.5 md:col-span-2">
                                                                                         <div className="flex items-center gap-2 text-blue-800">
                                                                                             <Scale className="h-4 w-4 shrink-0 text-blue-600" />
                                                                                             <span className="text-xs font-black">Dotación reglamentaria calculada (orientativa)</span>
                                                                                         </div>
                                                                                         <div className="mt-2.5 grid gap-2.5 text-[11px] leading-relaxed text-slate-700 sm:grid-cols-2">
                                                                                             <div className="flex flex-col gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2">
                                                                                                 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">NTP 350.043-1 / RNE A.130</span>
                                                                                                 <span className="text-sm font-black text-slate-900">{extintoresSugeridos} {extintoresSugeridos === 1 ? 'extintor' : 'extintores'} (mínimo sugerido)</span>
                                                                                                 <span className="text-[10px] text-slate-500">Cálculo: ceil({areaM2Num.toFixed(2)} m² / 60) = {extintoresMinimos}; por pisos = {extintoresPorPisos}</span>
                                                                                             </div>
                                                                                             <div className="flex flex-col gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2">
                                                                                                 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">Recorrido máximo</span>
                                                                                                 <span className="text-sm font-black text-slate-900">≤ 15 m horizontales</span>
                                                                                                 <span className="text-[10px] text-slate-500">Hasta el extintor más cercano (RNE A.130)</span>
                                                                                             </div>
                                                                                             <div className="flex flex-col gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2">
                                                                                                 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">Altura máxima</span>
                                                                                                 <span className="text-sm font-black text-slate-900">1.50 m al soporte superior</span>
                                                                                                 <span className="text-[10px] text-slate-500">Para facilitar el acceso inmediato</span>
                                                                                             </div>
                                                                                             <div className="flex flex-col gap-1 rounded-xl border border-blue-200 bg-white px-3 py-2">
                                                                                                 <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">Especialidad de cocina</span>
                                                                                                 <span className={`text-sm font-black ${tieneEquiposFritura ? 'text-amber-800' : 'text-slate-900'}`}>
                                                                                                     {tieneEquiposFritura === true
                                                                                                         ? 'Requiere extintor Tipo K (acetato de potasio)'
                                                                                                         : 'Tipo K no requerido con la declaración actual'}
                                                                                                 </span>
                                                                                                 <span className="text-[10px] text-slate-500">Freidoras/cocina comercial (Clase K)</span>
                                                                                             </div>
                                                                                         </div>
                                                                                         <p className="mt-2.5 text-[10px] leading-relaxed text-slate-500">
                                                                                             Cálculo orientativo basado en los metros cuadrados y pisos declarados. No sustituye a la verificación técnica de carga/riesgo por el especialista.
                                                                                         </p>
                                                                                     </div>
                                                                                 )}

                                                                                 {criterio.codigo === 'CRIT-04' && (
                                                                                     <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-3.5 md:col-span-2">
                                                                                         <div className="flex items-center gap-2 text-amber-900">
                                                                                             <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                                                                                             <span className="text-xs font-black">Exigencias paramétricas por aforo (orientativas)</span>
                                                                                         </div>
                                                                                         <div className="mt-2.5 space-y-2 text-[11px] leading-relaxed text-slate-700">
                                                                                             <div className={`rounded-xl border bg-white px-3 py-2 ${mostrarAlertaAforo100 ? 'border-rose-300 bg-rose-50' : mostrarAlertaAforo50 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                                                                                                 <span className={`text-sm font-black ${mostrarAlertaAforo100 ? 'text-rose-800' : mostrarAlertaAforo50 ? 'text-amber-800' : 'text-slate-900'}`}>
                                                                                                     {aforoNum > 0 ? `${aforoNum} personas declaradas` : 'Aforo no declarado'}
                                                                                                 </span>
                                                                                             </div>
                                                                                             {mostrarAlertaAforo50 && (
                                                                                                 <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2">
                                                                                                     <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                                                                                                     <div>
                                                                                                         <p className="font-semibold text-amber-900">Puertas hacia el exterior (flujo de evacuación)</p>
                                                                                                         <p className="mt-0.5 text-[10px] text-slate-600">
                                                                                                             Por tu aforo declarado (&gt;50 personas), la puerta de salida debe abrir obligatoriamente hacia el exterior (flujo de evacuación). (RNE A.010 Art. 35.d / RNE A.130 Art. 8)
                                                                                                         </p>
                                                                                                     </div>
                                                                                                 </div>
                                                                                             )}
                                                                                             {mostrarAlertaAforo100 && (
                                                                                                 <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-white px-3 py-2">
                                                                                                     <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                                                                                                     <div>
                                                                                                         <p className="font-semibold text-rose-800">Barra antipánico obligatoria</p>
                                                                                                         <p className="mt-0.5 text-[10px] text-slate-600">
                                                                                                             Por superar 100 personas de aforo, es obligatoria la instalación de barra antipánico (RNE A.010 / RNE A.130).
                                                                                                         </p>
                                                                                                     </div>
                                                                                                 </div>
                                                                                             )}
                                                                                             {!mostrarAlertaAforo50 && (
                                                                                                 <p className="text-[10px] text-slate-500">
                                                                                                     Con aforo ≤ 50 personas no se activa la exigencia paramétrica señalada; igualmente debe garantizarse la salida expedita y sin trabas durante la atención al público.
                                                                                                 </p>
                                                                                             )}
                                                                                         </div>
                                                                                     </div>
                                                                                 )}

                                                                                 {comparativa && (
                                                                                     <p className="text-[10px] leading-relaxed text-slate-500 md:col-span-2">
                                                                                         Referencia orientativa basada en la norma vigente; no constituye
                                                                                         una verificación oficial ni un dictamen de Defensa Civil.
                                                                                     </p>
                                                                                 )}
                                                                             </div>
                                                                         )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Material orientativo complementario */}
                                                        {tieneRecursos && (
                                                            <div className="pt-0.5">
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
                                                                    className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                                                        esPendienteCiudadano
                                                                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                                                    }`}
                                                                >
                                                                    <BookOpen className="h-4 w-4 shrink-0" />
                                                                    <span>
                                                                        Material orientativo{' '}
                                                                        {criterio.recursos_educativos && criterio.recursos_educativos.length > 1
                                                                            ? `(${criterio.recursos_educativos.length})`
                                                                            : ''}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Apunte personal privado (opcional, max 1000) */}
                                                        <div className="pt-2 border-t border-slate-100">
                                                            {!mostrarNotas[criterio.codigo] && !notas[criterio.codigo] ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMostrarNotas((prev) => ({ ...prev, [criterio.codigo]: true }))}
                                                                    className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
                                                                >
                                                                    <FileEdit className="h-3.5 w-3.5 text-slate-400" />
                                                                    <span>Añadir apunte personal (opcional)</span>
                                                                </button>
                                                            ) : (
                                                                <div className="space-y-1.5 rounded-2xl bg-slate-50/70 p-3.5 border border-slate-200">
                                                                    <div className="flex items-center justify-between gap-3 text-xs">
                                                                        <label
                                                                            htmlFor={`notas-${criterio.codigo}`}
                                                                            className="font-semibold text-slate-700 flex items-center gap-1.5"
                                                                        >
                                                                            <FileEdit className="h-3.5 w-3.5 text-slate-500" />
                                                                            <span>Apunte personal privado:</span>
                                                                        </label>
                                                                        <span className="text-[11px] text-slate-500 font-mono">{(notas[criterio.codigo] || '').length}/1000</span>
                                                                    </div>
                                                                    <textarea
                                                                        id={`notas-${criterio.codigo}`}
                                                                        value={notas[criterio.codigo] || ''}
                                                                        maxLength={1000}
                                                                        disabled={esRegistrada || guardandoAvance || guardandoContinuar}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            setNotas((prev) => ({ ...prev, [criterio.codigo]: val }));
                                                                            setCriteriosGuardados((prev) => ({ ...prev, [criterio.codigo]: false }));
                                                                        }}
                                                                        placeholder="Escribe un recordatorio para esta condición (ej. consultar con el técnico, comprar repuesto, revisar fecha)..."
                                                                        rows={2}
                                                                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-base sm:text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none disabled:bg-slate-100 disabled:opacity-75 resize-y min-h-20"
                                                                    />
                                                                    <p className="text-[10px] text-slate-500 leading-normal">
                                                                        Este apunte es privado para tu organización preventiva y no constituye un informe técnico oficial.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </fieldset>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
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

                        {/* Mismos handlers y misma condición de habilitación que la barra
                            inferior: el panel no reimplementa la persistencia. */}
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            {esRegistrada ? (
                                <Link
                                    href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-xs transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <span>Ver mi veredicto</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleContinuarAlResumen}
                                        disabled={guardandoAvance || guardandoContinuar || !todosRespondidos}
                                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                                            todosRespondidos
                                                ? 'cursor-pointer bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:ring-emerald-400'
                                                : 'cursor-not-allowed bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {guardandoContinuar ? (
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                        ) : (
                                            <>
                                                <span>Ver mi veredicto</span>
                                                <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleGuardarAvance}
                                        disabled={guardandoAvance || guardandoContinuar || respondidosCount === 0}
                                        className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {guardandoAvance ? (
                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5 text-slate-500" />
                                        )}
                                        <span>Guardar avance</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* ================================================== */}
            {/* Barra de acción fija inferior (solo móvil)          */}
            {/* En escritorio su lugar lo ocupa el panel lateral.   */}
            {/* ================================================== */}
<div className="sticky bottom-0 z-20 mx-auto max-w-4xl px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-0 lg:hidden">
                <div className="flex items-center justify-between gap-2 sm:gap-4 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 sm:px-5 sm:py-3 shadow-xl min-h-[60px]">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-300 truncate">
                        <ClipboardList className="h-4 w-4 shrink-0 text-emerald-400" />
                        <span className="font-bold text-white truncate">
                            {respondidosCount} de {criteriosAplicables.length} respondidos
                        </span>
                        {respondidosCount < criteriosAplicables.length && !esRegistrada && (
                            <span className="hidden md:inline text-amber-300">(Faltan {criteriosAplicables.length - respondidosCount})</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {!esRegistrada && (
                            <button
                                type="button"
                                onClick={handleGuardarAvance}
                                disabled={guardandoAvance || guardandoContinuar || respondidosCount === 0}
                                className="inline-flex items-center gap-1.5 h-11 sm:h-auto rounded-xl border border-slate-600 bg-slate-800 px-3.5 sm:px-4 sm:py-2 text-xs font-semibold text-slate-100 shadow-2xs hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                {guardandoAvance ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                                ) : (
                                    <Save className="h-3.5 w-3.5 text-slate-300" />
                                )}
                                <span className="hidden sm:inline">Guardar avance</span>
                                <span className="sm:hidden">Guardar</span>
                            </button>
                        )}

                        {esRegistrada ? (
                            <Link
                                href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                                className="inline-flex items-center gap-1.5 h-11 sm:h-auto rounded-xl bg-emerald-500 px-4 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-xs hover:bg-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <span>Ver Veredicto</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={handleContinuarAlResumen}
                                disabled={guardandoAvance || guardandoContinuar || !todosRespondidos}
                                className={`inline-flex items-center gap-1.5 h-11 sm:h-auto rounded-xl px-4 sm:px-5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                                    todosRespondidos
                                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:ring-emerald-400 cursor-pointer'
                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                {guardandoContinuar ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>Continuando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Ver mi veredicto</span>
                                        <ArrowRight className="h-3.5 w-3.5" />
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
        </>
    );
}
