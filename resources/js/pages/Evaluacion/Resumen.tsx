import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Clock,
    Copy,
    HelpCircle,
    Info,
    Loader2,
    Lock,
    Printer,
    RefreshCw,
    RotateCcw,
    Save,
    ShieldAlert,
    X,
} from 'lucide-react';

import type {
    FinalizarPendiente,
    ResumenProps,
} from '@/types/contrato';

/**
 * Secuencia del flujo ciudadano, alineada con el stepper de `Nueva.tsx` y
 * `Checklist.tsx` para que los tres pasos compartan el mismo vocabulario.
 */
const PASOS_FLUJO = [
    { numero: '1', titulo: 'Calcular riesgo', estado: 'completado' },
    { numero: '2', titulo: 'Simulacro en vivo', estado: 'completado' },
    { numero: '3', titulo: 'Veredicto', estado: 'activo' },
] as const;

/**
 * Etiquetas ciudadanas de `caracteristicas_declaradas`, que el backend entrega
 * ya filtrado a lo que el ciudadano realmente declaró en el paso 1
 * (ver `EvaluacionController::store`, `array_filter` sobre `null`).
 */
const CARACTERISTICAS_DECLARADAS: Record<string, { etiqueta: string; sufijo?: string }> = {
    area_m2: { etiqueta: 'Área techada', sufijo: ' m²' },
    pisos: { etiqueta: 'Número de pisos' },
    aforo: { etiqueta: 'Aforo declarado' },
    usa_glp: { etiqueta: 'Utiliza GLP' },
    galones_glp: { etiqueta: 'Cantidad de GLP almacenada', sufijo: ' galones' },
    usa_caldero: { etiqueta: 'Utiliza caldero' },
    usa_liquidos_inflamables: { etiqueta: 'Almacena o manipula líquidos inflamables' },
    tiene_equipos_fritura: { etiqueta: 'Equipos de fritura o cocción con aceites' },
    tiene_escaleras: { etiqueta: 'Escaleras de circulación' },
    tiene_estanterias_altas: { etiqueta: 'Estanterías altas o mobiliario con riesgo de volteo' },
};

export default function Resumen({
    autoevaluacion,
    resumen,
    pendiente_atender = [],
    por_revisar = [],
    cumple_declarado = [],
    no_aplica = [],
}: ResumenProps) {
    const { auth } = usePage().props as { auth?: { user: any | null } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState<boolean>(false);
    const [mostrarFichaDeclarada, setMostrarFichaDeclarada] = useState<boolean>(false);
    const [modalRecurso, setModalRecurso] = useState<{
        isOpen: boolean;
        recursos: RecursoEducativoData[];
        codigo?: string;
        titulo?: string;
    }>({
        isOpen: false,
        recursos: [],
    });
    const [finalizando, setFinalizando] = useState<boolean>(false);
    const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
    const [pendientesFinalizar, setPendientesFinalizar] = useState<FinalizarPendiente[]>([]);
    const [copiado, setCopiado] = useState<boolean>(false);

    const triggerRef = useRef<HTMLElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!mostrarModalConfirmacion) return;

        const timer = setTimeout(() => {
            cancelBtnRef.current?.focus();
        }, 50);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (!finalizando) {
                    setMostrarModalConfirmacion(false);
                    setErrorFinalizar(null);
                }
                return;
            }

            if (event.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (event.shiftKey) {
                    if (document.activeElement === firstElement) {
                        event.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        event.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            if (triggerRef.current && document.body.contains(triggerRef.current)) {
                triggerRef.current.focus();
                triggerRef.current = null;
            }
        };
    }, [mostrarModalConfirmacion, finalizando]);

    const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';

    /**
     * Ficha de las características que el ciudadano declaró en el paso 1.
     * Son datos eco de su propia declaración, ya consumidos por el motor de
     * aplicabilidad: no representan una clasificación de riesgo.
     */
    const caracteristicasDeclaradas = useMemo(() => {
        const fuente = autoevaluacion?.caracteristicas_declaradas;
        if (!fuente || typeof fuente !== 'object') return [];

        return Object.entries(fuente)
            .filter(([clave, valor]) => Boolean(CARACTERISTICAS_DECLARADAS[clave]) && valor !== null && valor !== undefined)
            // Los galones solo tienen sentido junto con la declaración de uso de GLP.
            .filter(([clave]) => clave !== 'galones_glp' || fuente.usa_glp === true)
            .map(([clave, valor]) => {
                const descriptor = CARACTERISTICAS_DECLARADAS[clave];
                const texto = valor === true ? 'Sí' : valor === false ? 'No' : `${valor}${descriptor.sufijo ?? ''}`;
                return { clave, etiqueta: descriptor.etiqueta, texto };
            });
    }, [autoevaluacion?.caracteristicas_declaradas]);

    /**
     * Desglose de cumplimiento cívico. El backend entrega conteos absolutos y
     * prohíbe porcentajes, semáforos y puntuaciones, así que el ancho de cada
     * segmento es solo una proporción visual y los únicos números impresos son
     * los de la prop `resumen`.
     */
    const totalAplicables = resumen.total_criterios_aplicables;
    const segmentosDesglose = [
        { clave: 'cumple', etiqueta: 'Declaradas cumplidas', valor: resumen.total_cumple_declarado, claseSegmento: 'bg-emerald-500' },
        { clave: 'pendiente', etiqueta: 'Pendientes de atender', valor: resumen.total_pendiente_atender, claseSegmento: 'bg-amber-500' },
        { clave: 'revisar', etiqueta: 'Por revisar', valor: resumen.total_por_revisar, claseSegmento: 'bg-sky-500' },
    ] as const;

    const anchoSegmento = (valor: number): number => {
        if (totalAplicables <= 0) return 0;
        return Math.min(100, Math.max(0, (valor / totalAplicables) * 100));
    };

    const abrirRecurso = (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => {
        setModalRecurso({
            isOpen: true,
            recursos: item.recursos_educativos || [],
            codigo: item.codigo,
            titulo: item.titulo,
        });
    };

    const copiarHash = () => {
        if (!autoevaluacion?.hash_integridad) return;
        navigator.clipboard.writeText(autoevaluacion.hash_integridad);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    const handleFinalizar = async () => {
        setFinalizando(true);
        setErrorFinalizar(null);
        setPendientesFinalizar([]);

        try {
            // El cierre se pide con fetch y no con router.post a propósito: Inertia
            // fuerza el encabezado Accept a "text/html, application/xhtml+xml" en su
            // cliente, por lo que el backend nunca ve wantsJson() y respondería con un
            // 302 ciego. Además, un 422 JSON plano no es una respuesta Inertia válida y
            // su único recurso de reproducción es el modal de error a pantalla
            // completa. Con fetch leemos el contrato 422 completo y mostramos la lista
            // de pendientes en lugar de rebotar al usuario sin explicación.
            const csrfToken =
                document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/finalizar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                setMostrarModalConfirmacion(false);
                router.reload();
                return;
            }

            if (response.status === 422) {
                const data = await response.json().catch(() => null);
                setErrorFinalizar(
                    data?.mensaje ??
                    'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.'
                );
                setPendientesFinalizar(Array.isArray(data?.pendientes) ? data.pendientes : []);
                return;
            }

            const data = await response.json().catch(() => null);
            setErrorFinalizar(
                data?.mensaje ??
                (response.status === 409
                    ? 'Esta autoevaluación ya se encuentra registrada y protegida contra modificaciones.'
                    : 'No fue posible registrar la autoevaluación. Intente nuevamente.')
            );
        } catch {
            setErrorFinalizar(
                'No fue posible registrar la autoevaluación. Verifique su conexión e intente nuevamente.'
            );
        } finally {
            setFinalizando(false);
        }
    };

    return (
        <>
            <Head title="Resumen de Autoevaluación - CheckITSE Huancayo" />

            <div className="relative">
                {/* Capa de patrón grid sutil, acotada a la columna de contenido */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-slate-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-200)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_10%,transparent_100%)]"
                />

                <div className="relative mx-auto max-w-4xl space-y-7 pb-24 print:max-w-none print:p-0 print:space-y-4 print:pb-0">
                    {/* ========================================================================= */}
                    {/* ENCABEZADO EXCLUSIVO PARA IMPRESIÓN                              */}
                    {/* ========================================================================= */}
                    <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                                    RESUMEN PREVENTIVO DE AUTOEVALUACIÓN CÍVICA
                                </h1>
                                <p className="text-xs text-slate-600 font-medium">
                                    Herramienta Ciudadana de Prevención y Orientación Técnica — CheckITSE Huancayo
                                </p>
                            </div>
                            {autoevaluacion.registrada_at && (
                                <div className="text-right text-xs text-slate-700">
                                    <span className="font-semibold">Fecha y hora de registro:</span>
                                    <br />
                                    {autoevaluacion.registrada_at}
                                </div>
                            )}
                        </div>

                        {/* Ficha del Establecimiento en Impresión */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-200 pt-2">
                            <div>
                                <span className="font-semibold text-slate-700">Establecimiento: </span>
                                <span className="text-slate-900">{autoevaluacion?.nombre_comercio || 'No declarado'}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-700">Giro o Actividad: </span>
                                <span className="text-slate-900">{autoevaluacion?.funcion_economica || 'No declarada'}</span>
                            </div>
                            {autoevaluacion?.ruc && (
                                <div>
                                    <span className="font-semibold text-slate-700">RUC: </span>
                                    <span className="font-mono text-slate-900">{autoevaluacion.ruc}</span>
                                </div>
                            )}
                            {autoevaluacion?.direccion && (
                                <div>
                                    <span className="font-semibold text-slate-700">Dirección: </span>
                                    <span className="text-slate-900">{autoevaluacion.direccion}</span>
                                </div>
                            )}
                            {autoevaluacion?.codigo_acceso && (
                                <div>
                                    <span className="font-semibold text-slate-700">Código de acceso CheckITSE: </span>
                                    <span className="font-mono font-bold text-slate-900">{autoevaluacion.codigo_acceso}</span>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold text-slate-700">Estado: </span>
                                <span className="font-medium text-slate-900">{esRegistrada ? 'REGISTRADA (Protegida contra modificaciones)' : 'INICIADA (En edición)'}</span>
                            </div>
                        </div>
                    </div>

                    {/* DESLINDE EXCLUSIVO PARA IMPRESIÓN */}
                    <div className="hidden print:block mb-4 rounded border border-slate-400 p-3 text-[10.5px] text-slate-800 leading-relaxed bg-white">
                        <p className="font-bold uppercase mb-1 text-black">
                            DECLARACIÓN CIUDADANA PREVENTIVA — NO CONSTITUYE INSPECCIÓN MUNICIPAL
                        </p>
                        <p>
                            Este documento refleja única y exclusivamente las condiciones de seguridad declaradas por el responsable del establecimiento a través de la plataforma comunitaria CheckITSE Huancayo. No acredita el cumplimiento de la normativa ITSE, no otorga autorización, licencia ni habilitación municipal alguna, y no reemplaza la inspección técnica oficial que corresponde a los órganos competentes de la Municipalidad Provincial de Huancayo.
                        </p>
                    </div>

                    {/* ========================================================================= */}
                    {/* ENCABEZADO PARA PANTALLA (Oculto en Impresión)                     */}
                    {/* ========================================================================= */}
                    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs print:hidden">
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
                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-900">
                                        {autoevaluacion?.nombre_comercio || 'Establecimiento'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                        <strong className="font-medium text-slate-500">Giro o Actividad:</strong>{' '}
                                        <span className="text-slate-800">{autoevaluacion?.funcion_economica || 'No declarada'}</span>
                                    </span>
                                    {autoevaluacion?.ruc && (
                                        <>
                                            <span>•</span>
                                            <span>
                                                <strong className="font-medium text-slate-500">RUC:</strong>{' '}
                                                <span className="font-mono text-slate-800">{autoevaluacion.ruc}</span>
                                            </span>
                                        </>
                                    )}
                                    {autoevaluacion?.direccion && (
                                        <>
                                            <span>•</span>
                                            <span>
                                                <strong className="font-medium text-slate-500">Dirección:</strong>{' '}
                                                <span className="text-slate-800">{autoevaluacion.direccion}</span>
                                            </span>
                                        </>
                                    )}
                                </div>

                                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Veredicto del autodiagnóstico</h1>
                                <p className="text-sm text-slate-500">
                                    Paso 3 de 3 · Resumen descriptivo de las declaraciones preventative de tu establecimiento
                                </p>
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

                        {/* Badge de Estado del Ciclo de Vida */}
                        <div className="mt-4">
                            {esRegistrada ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                                        <Lock className="h-3.5 w-3.5 text-emerald-700" />
                                        Autoevaluación registrada
                                    </span>
                                    {autoevaluacion.registrada_at && (
                                        <span className="text-xs text-slate-500 font-medium">
                                            Registrada el {autoevaluacion.registrada_at}
                                        </span>
                                    )}
                                    {autoevaluacion.codigo_acceso && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                            <span className="text-slate-500">Código de acceso:</span>
                                            <span className="font-mono font-bold text-slate-900">{autoevaluacion.codigo_acceso}</span>
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                                        En proceso de autoevaluación (Edición abierta)
                                    </span>
                                    {autoevaluacion.codigo_acceso && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                            <span className="text-slate-500">Código de acceso:</span>
                                            <span className="font-mono font-bold text-slate-900">{autoevaluacion.codigo_acceso}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Aviso Institucional Preventivo Obligatorio */}
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 leading-relaxed">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                                <div>
                                    <strong className="font-bold text-emerald-950">Aviso importante: </strong>
                                    Este resumen tiene carácter preventivo y orientativo. Presenta únicamente las declaraciones
                                    realizadas por el ciudadano y la información determinada por el sistema. No constituye una
                                    inspección técnica, certificación ITSE, aprobación, desaprobación ni clasificación oficial de riesgo.
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* ========================================================================= */}
                    {/* FICHA DE CARACTERÍSTICAS DECLARADAS EN EL PASO 1                    */}
                    {/* ========================================================================= */}
                    {caracteristicasDeclaradas.length > 0 && (
                        <section aria-labelledby="ficha-declarada-title" className="print:hidden">
                            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                                <button
                                    type="button"
                                    onClick={() => setMostrarFichaDeclarada(!mostrarFichaDeclarada)}
                                    aria-expanded={mostrarFichaDeclarada}
                                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                            <ClipboardList className="h-4 w-4" />
                                        </span>
                                        <div>
                                            <h2 id="ficha-declarada-title" className="text-sm font-bold text-slate-900">
                                                Características que declaraste en el paso 1
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Datos que el motor de aplicabilidad ya utilizó para definir qué condiciones te correspondían
                                            </p>
                                        </div>
                                    </div>
                                    {mostrarFichaDeclarada ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
                                </button>

                                {mostrarFichaDeclarada && (
                                    <div className="border-t border-slate-200 px-5 py-4">
                                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                                            {caracteristicasDeclaradas.map((caracteristica) => (
                                                <div key={caracteristica.clave} className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-100 pb-2">
                                                    <dt className="text-xs text-slate-500">{caracteristica.etiqueta}</dt>
                                                    <dd className="text-sm font-bold text-slate-800">{caracteristica.texto}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                                            Son tus propias declaraciones preventivas. El sistema solo las usó para decidir qué
                                            condiciones eran aplicables a tu local; no representan una clasificación de riesgo ni
                                            reemplazan la inspección técnica oficial.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* ========================================================================= */}
                    {/* TARJETA DE CIERRE — DESGLOSE DE CUMPLIMIENTO CÍVICO                 */}
                    {/* ========================================================================= */}
                    <section aria-labelledby="conteos-descriptivos-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 print:border-slate-300 print:shadow-none print:p-3">
                        <h2 id="conteos-descriptivos-title" className="sr-only">
                            Desglose del cumplimiento cívico declarado
                        </h2>

                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Desglose de cumplimiento cívico</h3>
                                    <p className="text-xs text-slate-500">
                                        Conteos absolutos de las {totalAplicables} condiciones que el sistema consideró aplicables a tu local
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Barra segmentada: proporción puramente visual, sin porcentajes impresos */}
                        <div className="mt-5">
                            <div aria-hidden="true" className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 print:hidden">
                                {totalAplicables > 0
                                    ? segmentosDesglose
                                          .filter((segmento) => segmento.valor > 0)
                                          .map((segmento) => (
                                              <div
                                                  key={segmento.clave}
                                                  className={`h-full ${segmento.claseSegmento} first:rounded-l-full last:rounded-r-full`}
                                                  style={{ width: `${anchoSegmento(segmento.valor)}%` }}
                                              />
                                          ))
                                    : <div className="h-full w-full rounded-full bg-slate-200" />}
                            </div>

                            {/* Leyenda con los números absolutos que entrega el backend */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                                {segmentosDesglose.map((segmento) => (
                                    <div key={segmento.clave} className="flex items-center gap-2">
                                        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${segmento.claseSegmento}`} />
                                        <span className="text-xs text-slate-500">{segmento.etiqueta}</span>
                                        <span className="text-sm font-bold text-slate-900">{segmento.valor}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tarjetas de conteo: leen exclusivamente la prop `resumen` */}
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5 print:gap-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs print:border-slate-300 print:shadow-none print:p-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                    <ClipboardList className="h-4 w-4 text-slate-400 print:hidden" />
                                    <span>Condiciones aplicables</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 print:text-xl">
                                    {resumen.total_criterios_aplicables}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">Evaluadas en su local</p>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs print:border-slate-300 print:bg-white print:shadow-none print:p-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 print:text-slate-700">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 print:hidden" />
                                    <span>Declaradas cumplidas</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 print:text-xl print:text-slate-900">
                                    {resumen.total_cumple_declarado}
                                </div>
                                <p className="mt-1 text-[11px] text-emerald-700 print:text-slate-500">Declaración ciudadana</p>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs print:border-slate-300 print:bg-white print:shadow-none print:p-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 print:text-slate-700">
                                    <Clock className="h-4 w-4 text-amber-600 print:hidden" />
                                    <span>Pendientes de atender</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-amber-950 print:text-xl print:text-slate-900">
                                    {resumen.total_pendiente_atender}
                                </div>
                                <p className="mt-1 text-[11px] text-amber-700 print:text-slate-500">Atención preventiva</p>
                            </div>

                            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-2xs print:border-slate-300 print:bg-white print:shadow-none print:p-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-sky-800 print:text-slate-700">
                                    <HelpCircle className="h-4 w-4 text-sky-600 print:hidden" />
                                    <span>Por revisar</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-sky-950 print:text-xl print:text-slate-900">
                                    {resumen.total_por_revisar}
                                </div>
                                <p className="mt-1 text-[11px] text-sky-700 print:text-slate-500">Revisión adicional</p>
                            </div>

                            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-2xs print:border-slate-300 print:bg-white print:shadow-none print:p-2.5 sm:col-span-1">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                    <ShieldAlert className="h-4 w-4 text-slate-400 print:hidden" />
                                    <span>No aplicables</span>
                                </div>
                                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-700 print:text-xl print:text-slate-900">
                                    {resumen.total_no_aplica}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">Regla del sistema</p>
                            </div>
                        </div>

                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            Los “no aplicables” no forman parte de las {totalAplicables} condiciones aplicables: los determinó el motor
                            técnico a partir de lo que declaraste en el paso 1 y no son seleccionables por ti.
                        </p>
                    </section>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 1 — ASPECTOS QUE REQUIEREN ATENCIÓN PREVENTIVA             */}
                    {/* ========================================================================= */}
                    <section className="space-y-4 print:space-y-3">
                        <div className="rounded-3xl border border-amber-200 bg-amber-50/30 p-5 print:border-slate-300 print:bg-white print:p-3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 print:hidden">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Aspectos que requieren atención preventiva ({resumen.total_pendiente_atender})
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Condiciones que usted indicó que requieren atención preventiva en su establecimiento.
                                        Consulte las orientaciones sugeridas para atenderlas de forma preventiva.
                                    </p>
                                </div>
                            </div>

                            {pendiente_atender.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 print:p-2 print:text-xs">
                                    No declaró aspectos pendientes de atención preventiva.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3 print:space-y-2.5">
                                    {pendiente_atender.map((item) => (
                                        <div
                                            key={item.codigo}
                                            className="rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs space-y-3 print:border-slate-300 print:shadow-none print:p-3 print:break-inside-avoid"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 print:pb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {item.codigo}
                                                    </span>
                                                    <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 print:text-slate-800 print:bg-slate-100 print:border-slate-300">
                                                        Aspecto declarado como pendiente de atención
                                                    </span>
                                                </div>
                                                {(item.norma_base || item.articulo_referencia) && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                        <BookOpen className="h-3.5 w-3.5 text-slate-400 print:hidden" />
                                                        <span>
                                                            {item.norma_base}
                                                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-sm font-semibold text-slate-900">{item.titulo}</h3>

                                            {item.pregunta_ciudadana && (
                                                <div className="rounded-xl bg-amber-100/50 p-3 text-xs text-amber-950 border border-amber-200 print:bg-white print:border-slate-300 print:text-slate-900 print:p-2">
                                                    <strong className="font-bold">Lo que se te preguntó: </strong>
                                                    {item.pregunta_ciudadana}
                                                </div>
                                            )}

                                            {item.que_observar && (
                                                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 print:bg-white print:border-slate-200 print:p-2">
                                                    <strong className="text-slate-900 font-medium">Qué observar en el establecimiento: </strong>
                                                    {item.que_observar}
                                                </div>
                                            )}

                                            {item.accion_mejora_orientativa && (
                                                <div className="rounded-xl bg-amber-50/60 p-3 text-xs text-amber-900 border border-amber-200/60 print:bg-white print:border-slate-300 print:text-slate-900 print:p-2">
                                                    <strong className="font-semibold text-amber-950 print:text-slate-900">Orientación de atención preventiva: </strong>
                                                    {item.accion_mejora_orientativa}
                                                </div>
                                            )}

                                            {/* Nota personal del ciudadano cuando existe */}
                                            {item.notas && item.notas.trim().length > 0 && (
                                                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200 print:bg-white print:border-slate-300 print:p-2">
                                                    <strong className="text-slate-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                                                        Nota personal del comerciante:
                                                    </strong>
                                                    <p className="whitespace-pre-line text-slate-700 italic">
                                                        {item.notas.trim()}
                                                    </p>
                                                </div>
                                            )}

                                            {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-amber-50/80 p-3 text-xs border border-amber-200 print:hidden">
                                                    <div className="flex items-center gap-2 text-amber-900 font-medium">
                                                        <BookOpen className="h-4 w-4 shrink-0 text-amber-700" />
                                                        <span>Material pedagógico y orientaciones de prevención:</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirRecurso(item)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 font-semibold text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-100/60 transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <span>Consultar material complementario</span>
                                                        {item.recursos_educativos.length > 1 && (
                                                            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                                                                {item.recursos_educativos.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 2 — ASPECTOS POR REVISAR O INDAGAR                         */}
                    {/* ========================================================================= */}
                    <section className="space-y-4 print:space-y-3">
                        <div className="rounded-3xl border border-sky-200 bg-sky-50/30 p-5 print:border-slate-300 print:bg-white print:p-3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 print:hidden">
                                    <HelpCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Aspectos por revisar o indagar ({resumen.total_por_revisar})
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Una declaración de “Por revisar” no significa incumplimiento ni infracción; refleja que usted
                                        considera necesario realizar una verificación adicional o consultar con personal técnico competente.
                                    </p>
                                </div>
                            </div>

                            {por_revisar.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 print:p-2 print:text-xs">
                                    No declaró aspectos con revisión pendiente.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3 print:space-y-2.5">
                                    {por_revisar.map((item) => (
                                        <div
                                            key={item.codigo}
                                            className="rounded-2xl border border-sky-200 bg-white p-4 shadow-2xs space-y-3 print:border-slate-300 print:shadow-none print:p-3 print:break-inside-avoid"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 print:pb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {item.codigo}
                                                    </span>
                                                    <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 print:text-slate-800 print:bg-slate-100 print:border-slate-300">
                                                        Revisión adicional pendiente
                                                    </span>
                                                </div>
                                                {(item.norma_base || item.articulo_referencia) && (
                                                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                        <BookOpen className="h-3.5 w-3.5 text-slate-400 print:hidden" />
                                                        <span>
                                                            {item.norma_base}
                                                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-sm font-semibold text-slate-900">{item.titulo}</h3>

                                            {item.que_observar && (
                                                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 print:bg-white print:border-slate-200 print:p-2">
                                                    <strong className="text-slate-900 font-medium">Condición a verificar: </strong>
                                                    {item.que_observar}
                                                </div>
                                            )}

                                            {item.orientacion && (
                                                <div className="rounded-xl bg-sky-50/60 p-3 text-xs text-sky-900 border border-sky-200/60 print:bg-white print:border-slate-300 print:text-slate-900 print:p-2">
                                                    <strong className="font-semibold text-sky-950 print:text-slate-900">Orientación para la revisión: </strong>
                                                    {item.orientacion}
                                                </div>
                                            )}

                                            {/* Nota personal del ciudadano cuando existe */}
                                            {item.notas && item.notas.trim().length > 0 && (
                                                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-800 border border-slate-200 print:bg-white print:border-slate-300 print:p-2">
                                                    <strong className="text-slate-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                                                        Nota personal del comerciante:
                                                    </strong>
                                                    <p className="whitespace-pre-line text-slate-700 italic">
                                                        {item.notas.trim()}
                                                    </p>
                                                </div>
                                            )}

                                            {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl bg-sky-50/80 p-3 text-xs border border-sky-200 print:hidden">
                                                    <div className="flex items-center gap-2 text-sky-900 font-medium">
                                                        <BookOpen className="h-4 w-4 shrink-0 text-sky-700" />
                                                        <span>Orientación técnica recomendada para la verificación:</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => abrirRecurso(item)}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 font-semibold text-sky-900 border border-sky-300 shadow-2xs hover:bg-sky-100/60 transition-colors cursor-pointer shrink-0"
                                                    >
                                                        <span>Consultar material técnico</span>
                                                        {item.recursos_educativos.length > 1 && (
                                                            <span className="rounded-full bg-sky-200 px-1.5 py-0.2 text-[10px] font-bold">
                                                                {item.recursos_educativos.length}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 3 — CONDICIONES DECLARADAS CUMPLIDAS                       */}
                    {/* ========================================================================= */}
                    <section className="space-y-4 print:space-y-3">
                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/20 p-5 print:border-slate-300 print:bg-white print:p-3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 print:hidden">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Condiciones declaradas como cumplidas ({resumen.total_cumple_declarado})
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Condiciones que usted declaró cumplir según su propia observación. Esta declaración tiene carácter
                                        cívico y no representa una comprobación física oficial.
                                    </p>
                                </div>
                            </div>

                            {cumple_declarado.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 print:p-2 print:text-xs">
                                    No registró condiciones con cumplimiento declarado.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-2.5 print:space-y-2">
                                    {cumple_declarado.map((item) => (
                                        <div
                                            key={item.codigo}
                                            className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs print:border-slate-300 print:shadow-none print:p-2.5 print:break-inside-avoid"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            {item.codigo}
                                                        </span>
                                                        <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 print:text-slate-800 print:bg-slate-100 print:border-slate-300">
                                                            Declarado por el ciudadano como cumplido
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-slate-800">{item.titulo}</p>
                                                </div>

                                                <div className="flex items-center gap-3 sm:self-center shrink-0">
                                                    {(item.norma_base || item.articulo_referencia) && (
                                                        <span className="text-[11px] text-slate-400">
                                                            {item.norma_base}
                                                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                                                        </span>
                                                    )}
                                                    {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirRecurso(item)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer print:hidden"
                                                        >
                                                            <BookOpen className="w-3 h-3" />
                                                            <span>Consultar guía</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Nota personal del ciudadano cuando existe */}
                                            {item.notas && item.notas.trim().length > 0 && (
                                                <div className="mt-1 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-800 border border-slate-200 print:bg-white print:border-slate-300 print:p-2">
                                                    <strong className="text-slate-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                                                        Nota personal del comerciante:
                                                    </strong>
                                                    <p className="whitespace-pre-line text-slate-700 italic">
                                                        {item.notas.trim()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 4 — CONDICIONES DETERMINADAS COMO NO APLICABLES             */}
                    {/* ========================================================================= */}
                    <section className="space-y-4 print:space-y-3">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5 print:border-slate-300 print:bg-white print:p-3">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 print:hidden">
                                    <ShieldAlert className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        Condiciones determinadas como no aplicables ({resumen.total_no_aplica})
                                    </h2>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Criterios determinados automáticamente por las reglas del sistema a partir de las características
                                        físicas declaradas (p. ej., no usar GLP, no contar con equipos de cocción con aceites o escaleras).
                                        Este estado es asignado por el motor normativo y no es seleccionable por el ciudadano.
                                    </p>
                                </div>
                            </div>

                            {no_aplica.length === 0 ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 print:p-2 print:text-xs">
                                    Todas las condiciones activas aplican a las características de su establecimiento.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-2.5 print:space-y-2">
                                    {no_aplica.map((item) => (
                                        <div
                                            key={item.codigo}
                                            className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2 print:border-slate-300 print:shadow-none print:p-2.5 print:break-inside-avoid"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {item.codigo}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 print:border-slate-300">
                                                        No aplicable (motor técnico)
                                                    </span>
                                                </div>
                                                {(item.norma_base || item.articulo_referencia) && (
                                                    <span className="text-[11px] text-slate-400">
                                                        {item.norma_base}
                                                        {item.articulo_referencia && ` (${item.articulo_referencia})`}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm font-semibold text-slate-800">{item.titulo}</p>

                                            <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 print:bg-white print:border-slate-200 print:p-2">
                                                <strong className="text-slate-700">Fundamento técnico del sistema: </strong>
                                                {item.motivo}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* SECCIÓN 5 — VERIFICACIÓN DE INTEGRIDAD TÉCNICA (Solo REGISTRADA)   */}
                    {/* ========================================================================= */}
                    {esRegistrada && autoevaluacion.hash_integridad && (
                        <section
                            aria-labelledby="integridad-tecnica-title"
                            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs print:border-slate-300 print:shadow-none print:break-inside-avoid"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Lock className="h-4 w-4 text-slate-500" />
                                <h2 id="integridad-tecnica-title" className="text-sm font-bold text-slate-900">
                                    Verificación de Integridad Técnica
                                </h2>
                            </div>
                            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                Verificación de integridad técnica (SHA-256): este código permite comprobar técnicamente si el contenido registrado coincide con la declaración original. No constituye acreditación ni certificación municipal.
                            </p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="flex-1 rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all print:bg-white print:border-slate-300">
                                    {autoevaluacion.hash_integridad}
                                </div>
                                <button
                                    type="button"
                                    onClick={copiarHash}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shrink-0 print:hidden cursor-pointer"
                                >
                                    {copiado ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>Copiado</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Copiar código</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* ========================================================================= */}
                    {/* TARJETA DE CIERRE — ACCIÓN PRINCIPAL (Oculta en Impresión)         */}
                    {/* ========================================================================= */}
                    <footer className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs print:hidden">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm leading-relaxed text-slate-600 sm:max-w-md">
                                <span className="block text-base font-bold text-slate-900">
                                    {esRegistrada ? 'Autoevaluación registrada y sellada' : 'Cierre de tu autodiagnóstico preventivo'}
                                </span>
                                {esRegistrada
                                    ? 'Tus declaraciones quedaron registradas con un código de integridad que puedes compartir o imprimir.'
                                    : 'Revisa el desglose y confirma el registro para generar el resumen preventivo definitivo de tu establecimiento.'}
                            </div>

                            <div className="flex flex-col gap-2.5 sm:shrink-0">
                                {!esRegistrada ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            triggerRef.current = e.currentTarget;
                                            setErrorFinalizar(null);
                                            setMostrarModalConfirmacion(true);
                                        }}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
                                    >
                                        <Lock className="h-4 w-4" />
                                        <span>Confirmar y registrar autoevaluación</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors cursor-pointer"
                                    >
                                        <Printer className="h-4 w-4" />
                                        <span>Imprimir resumen preventivo / Guardar PDF</span>
                                    </button>
                                )}

                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    {auth?.user && (
                                        <Link
                                            href="/mis-autoevaluaciones"
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer"
                                        >
                                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Mis autoevaluaciones</span>
                                        </Link>
                                    )}
                                    <Link
                                        href={`/autoevaluacion/${autoevaluacion.uuid}/checklist`}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors cursor-pointer"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                        <span>{esRegistrada ? 'Ver en checklist (lectura)' : 'Modificar en checklist'}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Aviso preventivo institucional sobre la acción de cierre */}
                        {!esRegistrada && (
                            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950">
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                <p>
                                    <strong className="font-bold">Acción definitiva e inmutable: </strong>
                                    al registrar la autoevaluación, las declarações quedarán guardadas como una versión cerrada y ya no
                                    podrán modificarse. Si posteriormente desea realizar cambios, deberá iniciar una reevaluación.
                                </p>
                            </div>
                        )}

                        {/* Acción de reevaluación preventiva (solo REGISTRADA) */}
                        {esRegistrada && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-5">
                                <div className="text-xs text-slate-600 max-w-xl text-center sm:text-left leading-relaxed">
                                    <span className="font-semibold text-slate-800 block mb-0.5">
                                        ¿Realizó mejoras en su establecimiento o desea actualizar sus declaraciones?
                                    </span>
                                    Inicia una nueva autoevaluación tomando los datos de este local como referencia para evaluar mejoras o cambios. Tu autoevaluación anterior permanecerá inalterable en tu historial.
                                </div>
                                <Link
                                    href={`/autoevaluacion/reevaluar/${autoevaluacion.uuid}`}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors w-full sm:w-auto shrink-0 cursor-pointer"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    <span>Iniciar nueva autoevaluación preventiva</span>
                                </Link>
                            </div>
                        )}
                    </footer>
                </div>
            </div>

            {/* Modal de Confirmación de Cierre */}
            {mostrarModalConfirmacion && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity print:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-confirmar-titulo"
                >
                    <div ref={modalRef} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 id="modal-confirmar-titulo" className="text-lg font-bold text-slate-900">
                                        Confirmar y registrar autoevaluación
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Paso final para el cierre formal del registro
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!finalizando) {
                                        setMostrarModalConfirmacion(false);
                                        setErrorFinalizar(null);
                                    }
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                                aria-label="Cerrar modal"
                                disabled={finalizando}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="font-semibold text-amber-950">
                                    Atención: acción definitiva e inmutable
                                </p>
                            </div>
                            <p className="leading-relaxed">
                                Al registrar la autoevaluación, las declaraciones quedarán guardadas como una versión cerrada y ya no podrán modificarse. Si posteriormente desea realizar cambios, deberá iniciar una reevaluación.
                            </p>
                        </div>

                        {errorFinalizar && (
                            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <p>{errorFinalizar}</p>

                                    {pendientesFinalizar.length > 0 && (
                                        <ul className="space-y-1 rounded-lg bg-white/70 p-2.5 border border-rose-100">
                                            {pendientesFinalizar.map((pendiente) => (
                                                <li key={pendiente.codigo} className="flex flex-col gap-0.5">
                                                    <span className="font-mono text-[11px] font-bold text-rose-900">
                                                        {pendiente.codigo}
                                                    </span>
                                                    <span className="text-rose-800">{pendiente.titulo}</span>
                                                    {pendiente.motivo && (
                                                        <span className="text-[11px] text-rose-600">{pendiente.motivo}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <Link
                                        href={`/autoevaluacion/${autoevaluacion.uuid}/checklist`}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-50 transition-colors"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Volver al checklist y completar</span>
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                            <button
                                ref={cancelBtnRef}
                                type="button"
                                onClick={() => {
                                    setMostrarModalConfirmacion(false);
                                    setErrorFinalizar(null);
                                }}
                                disabled={finalizando}
                                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalizar}
                                disabled={finalizando}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                            >
                                {finalizando ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Registrando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Confirmar registro</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalGuardarProgreso
                isOpen={mostrarModalGuardar}
                onClose={() => setMostrarModalGuardar(false)}
                uuid={autoevaluacion?.uuid}
                establecimiento={autoevaluacion?.nombre_comercio}
                destino="resumen"
            />

            <RecursoEducativoModal
                isOpen={modalRecurso.isOpen}
                onClose={() => setModalRecurso((prev) => ({ ...prev, isOpen: false }))}
                recursos={modalRecurso.recursos}
                criterioCodigo={modalRecurso.codigo}
                criterioTitulo={modalRecurso.titulo}
            />
        </>
    );
}
