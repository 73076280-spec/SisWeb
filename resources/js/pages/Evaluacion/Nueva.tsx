import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import type { FormDataConvertible } from '@inertiajs/core';
import { GuiaModal } from '@/components/GuiaModal';
import {
    Store,
    Flame,
    Layers,
    ArrowRight,
    ArrowLeft,
    Info,
    BookOpen,
    MapPin,
    RefreshCw,
    UtensilsCrossed,
    Footprints,
    Package,
    AlertCircle,
    Gauge,
    Clock,
    Building2,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';

export interface ReevaluacionData {
    uuid: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    direccion?: string | null;
    referencia?: string | null;
    area_m2?: string | number | null;
    pisos?: number | null;
    aforo?: number | null;
    usa_glp?: boolean | null;
    galones_glp?: number | null;
    usa_caldero?: boolean | null;
    usa_liquidos_inflamables?: boolean | null;
    tiene_equipos_fritura?: boolean | null;
    tiene_escaleras?: boolean | null;
    tiene_estanterias_altas?: boolean | null;
    fecha_anterior?: string;
    semaforo_anterior?: string;
}

interface NuevaProps {
    catalogo?: unknown[];
    reevaluacionDe?: ReevaluacionData | null;
}

interface FormEvaluacionData {
    evaluacion_origen_uuid?: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string;
    direccion: string;
    referencia: string;
    area_m2: string;
    pisos: number | string;
    aforo: number | string;
    usa_glp: boolean | null;
    galones_glp: number | string;
    usa_caldero: boolean | null;
    usa_liquidos_inflamables: boolean | null;
    tiene_equipos_fritura: boolean | null;
    tiene_escaleras: boolean | null;
    tiene_estanterias_altas: boolean | null;
    [key: string]: FormDataConvertible;
}

type ModalidadTramite = 'EX_POST' | 'EX_ANTE';

interface PrecalificacionOrientativa {
    modalidad: ModalidadTramite;
    titulo: string;
    nivel: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';
    factores: string[];
}

/**
 * Criterios normativos que el motor de aplicabilidad habilita a partir de cada
 * declaración física del ciudadano (R.J. 016-2018-CENEPRED/J y D.S. 002-2018-PCM).
 */
const CRITERIOS_POR_DECLARACION = [
    { codigo: 'CRIT-10', etiqueta: 'Gas Licuado de Petróleo', campo: 'usa_glp' },
    { codigo: 'CRIT-02A', etiqueta: 'Cocción con aceites · Clase K', campo: 'tiene_equipos_fritura' },
    { codigo: 'CRIT-11', etiqueta: 'Escaleras y pasamanos', campo: 'tiene_escaleras' },
    { codigo: 'CRIT-13', etiqueta: 'Arriostramiento antisísmico', campo: 'tiene_estanterias_altas' },
] as const;

const CAMPOS_DECLARACION = ['usa_glp', 'tiene_equipos_fritura', 'tiene_escaleras', 'tiene_estanterias_altas'] as const;

const AREA_MAXIMA_EX_POST = 750;
const PISOS_MAXIMOS_EX_POST = 3;
const AFORO_MAXIMO_GIRO_ESPECIAL = 100;
const GALONES_MAXIMOS_EX_POST = 118.18;
const GIROS_ESPECIALES = ['Hospedaje', 'Salud'];

const SEMAFORO_CONFIG: Record<string, { fondo: string; texto: string; borde: string }> = {
    Bajo: { fondo: 'bg-emerald-50', texto: 'text-emerald-900', borde: 'border-emerald-200' },
    Medio: { fondo: 'bg-emerald-50', texto: 'text-emerald-900', borde: 'border-emerald-200' },
    Alto: { fondo: 'bg-rose-50', texto: 'text-rose-900', borde: 'border-rose-200' },
    'Muy Alto': { fondo: 'bg-rose-100', texto: 'text-rose-950', borde: 'border-rose-300' },
};

function aNumero(valor: string | number | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
}

/**
 * Precalificación estrictamente local y orientativa.
 *
 * Reproduce los umbrales de función y escala física compendiados en
 * `GuiaModal.tsx` (D.S. 002-2018-PCM y R.J. 016-2018-CENEPRED/J). Se deriva
 * únicamente de lo que el ciudadano declara en el formulario, no consulta ni
 * invoca `ItseRiskService::clasificarTramite()`, no añade campos al `useForm()`,
 * no se envía al backend y no se persiste: la Determinación formal y los plazos
 * corresponden exclusivamente a la municipalidad distrital.
 */
function precalificarLocalmente(data: FormEvaluacionData): PrecalificacionOrientativa | null {
    const factores: string[] = [];

    const area = aNumero(data.area_m2);
    const pisos = aNumero(data.pisos);
    const aforo = aNumero(data.aforo);
    const galones = aNumero(data.galones_glp);

    if (area !== null && area > AREA_MAXIMA_EX_POST) {
        factores.push(`Área techada de ${area} m², sobre el máximo de ${AREA_MAXIMA_EX_POST} m²`);
    }

    if (pisos !== null && pisos > PISOS_MAXIMOS_EX_POST) {
        factores.push(`${pisos} pisos, sobre el máximo de ${PISOS_MAXIMOS_EX_POST}`);
    }

    if (GIROS_ESPECIALES.includes(data.funcion_economica) && aforo !== null && aforo > AFORO_MAXIMO_GIRO_ESPECIAL) {
        factores.push(`Aforo de ${aforo} personas en giro de ${data.funcion_economica.toLowerCase()}, sobre el límite de ${AFORO_MAXIMO_GIRO_ESPECIAL}`);
    }

    if (data.usa_glp === true && galones !== null && galones > GALONES_MAXIMOS_EX_POST) {
        factores.push(`GLP declarado de ${galones} galones, sobre el máximo de ${GALONES_MAXIMOS_EX_POST}`);
    }

    if (data.usa_caldero === true) {
        factores.push('Caldero declarado en el establecimiento');
    }

    if (factores.length > 0) {
        return {
            modalidad: 'EX_ANTE',
            titulo: 'ITSE Previa (Ex-Ante)',
            nivel: area !== null && area > AREA_MAXIMA_EX_POST ? 'Muy Alto' : 'Alto',
            factores,
        };
    }

    if (area === null && pisos === null && aforo === null) {
        return null;
    }

    return {
        modalidad: 'EX_POST',
        titulo: 'ITSE Posterior (Ex-Post)',
        nivel: area !== null && area > 300 ? 'Medio' : 'Bajo',
        factores: [`Área techada dentro del rango de hasta ${AREA_MAXIMA_EX_POST} m², hasta ${PISOS_MAXIMOS_EX_POST} pisos y sin factores agravantes`],
    };
}

const PASOS_FLUJO = [
    { numero: '1', titulo: 'Calcular riesgo', estado: 'activo' },
    { numero: '2', titulo: 'Simulacro en vivo', estado: 'pendiente' },
    { numero: '3', titulo: 'Veredicto', estado: 'pendiente' },
] as const;

export default function Nueva({ reevaluacionDe = null }: NuevaProps) {
    const [showGuia, setShowGuia] = useState<boolean>(false);
    const [erroresFormulario, setErroresFormulario] = useState<Record<string, string>>({});

    const { data, setData, post, processing, errors } = useForm<FormEvaluacionData>({
        evaluacion_origen_uuid: reevaluacionDe?.uuid ?? '',
        nombre_comercio: reevaluacionDe?.nombre_comercio ?? '',
        funcion_economica: reevaluacionDe?.funcion_economica ?? 'Comercio',
        ruc: reevaluacionDe?.ruc ?? '',
        direccion: reevaluacionDe?.direccion ?? '',
        referencia: reevaluacionDe?.referencia ?? '',
        area_m2: reevaluacionDe?.area_m2 != null ? String(reevaluacionDe.area_m2) : '',
        pisos: reevaluacionDe?.pisos != null ? reevaluacionDe.pisos : '',
        aforo: reevaluacionDe?.aforo != null ? reevaluacionDe.aforo : '',
        usa_glp: reevaluacionDe?.usa_glp !== undefined ? reevaluacionDe.usa_glp : null,
        galones_glp: reevaluacionDe?.galones_glp != null ? reevaluacionDe.galones_glp : '',
        usa_caldero: reevaluacionDe?.usa_caldero !== undefined ? reevaluacionDe.usa_caldero : null,
        usa_liquidos_inflamables:
            reevaluacionDe?.usa_liquidos_inflamables !== undefined ? reevaluacionDe.usa_liquidos_inflamables : null,
        tiene_equipos_fritura: reevaluacionDe?.tiene_equipos_fritura !== undefined ? reevaluacionDe.tiene_equipos_fritura : null,
        tiene_escaleras: reevaluacionDe?.tiene_escaleras !== undefined ? reevaluacionDe.tiene_escaleras : null,
        tiene_estanterias_altas: reevaluacionDe?.tiene_estanterias_altas !== undefined ? reevaluacionDe.tiene_estanterias_altas : null,
    });

    const precalificacion = precalificarLocalmente(data);

    const declaracionesPendientes = CAMPOS_DECLARACION.filter(campo => data[campo] === null || data[campo] === undefined).length;

    const limpiarErrorDe = (campo: string) => {
        if (!erroresFormulario[campo]) return;
        setErroresFormulario(prev => {
            const rest = { ...prev };
            delete rest[campo];
            return rest;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const errs: Record<string, string> = {};

        // 1. Nombre comercial obligatorio
        if (!data.nombre_comercio.trim()) {
            errs.nombre_comercio = 'Ingresa el nombre comercial de tu establecimiento.';
        }

        // 2. RUC opcional pero con formato estricto si se ingresa
        if (data.ruc.trim() && !/^(10|20)\d{9}$/.test(data.ruc.trim())) {
            errs.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos y comenzar con 10 o 20.';
        }

        // 3. Escala física numérica si se ingresa
        if (data.area_m2.trim() && (Number.isNaN(Number(data.area_m2)) || Number(data.area_m2) <= 0)) {
            errs.area_m2 = 'El área debe ser un valor mayor a 0 metros cuadrados.';
        }

        if (data.pisos !== '' && data.pisos !== null && (Number.isNaN(Number(data.pisos)) || Number(data.pisos) < 1)) {
            errs.pisos = 'El número de pisos debe ser al menos 1.';
        }

        if (data.aforo !== '' && data.aforo !== null && (Number.isNaN(Number(data.aforo)) || Number(data.aforo) < 1)) {
            errs.aforo = 'El aforo estimado debe ser al menos 1 persona.';
        }

        // 4. Variables obligatorias de aplicabilidad (no pueden quedar nulas)
        if (data.usa_glp === null || data.usa_glp === undefined) {
            errs.usa_glp = 'Por favor declara si tu local utiliza GLP (Sí o No).';
        }

        if (data.tiene_equipos_fritura === null || data.tiene_equipos_fritura === undefined) {
            errs.tiene_equipos_fritura = 'Por favor declara si cuentas con equipos de fritura o cocción con aceites (Sí o No).';
        }

        if (data.tiene_escaleras === null || data.tiene_escaleras === undefined) {
            errs.tiene_escaleras = 'Por favor declara si tu local cuenta con escaleras de circulación (Sí o No).';
        }

        if (data.tiene_estanterias_altas === null || data.tiene_estanterias_altas === undefined) {
            errs.tiene_estanterias_altas = 'Por favor declara si cuentas con estanterías altas o mobiliario alto (Sí o No).';
        }

        setErroresFormulario(errs);

        if (Object.keys(errs).length > 0) {
            // Enfocar o hacer scroll al primer error
            const primerError = Object.keys(errs)[0];
            const elem = document.getElementById(`campo-${primerError}`) || document.getElementById(`est-${primerError}`);
            if (elem) {
                elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        if (reevaluacionDe?.uuid) {
            post(`/autoevaluacion/reevaluar/${reevaluacionDe.uuid}`);
        } else {
            post('/autoevaluacion');
        }
    };

    return (
        <>
            <Head title="CheckITSE Huancayo - Datos del Establecimiento" />
            <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

            <div className="relative">
                {/* Capa de patrón grid sutil, acotada a la columna de contenido */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-slate-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-200)_1px,transparent_1px)] bg-[size:28px_28px] opacity-45 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_10%,transparent_100%)]"
                />

                <div className="relative mx-auto max-w-3xl text-left pb-16">
                    {/* ============================================== */}
                    {/* Cabecera                                     */}
                    {/* ============================================== */}
                    <div className="text-center mb-7">
                        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full">
                            <Gauge className="w-3.5 h-3.5" />
                            Paso 1 de 3 · Pre-screening
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-4">Calcula el riesgo de tu local</h1>
                        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
                            Registra la información de tu establecimiento. El motor de aplicabilidad determinará qué criterios normativos aplican realmente a tu caso.
                        </p>
                    </div>

                    {/* ============================================== */}
                    {/* Barra de progreso del flujo                    */}
                    {/* ============================================== */}
                    <ol
                        aria-label="Flujo de autoevaluación: 1. Calcular riesgo, 2. Simulacro en vivo, 3. Veredicto"
                        className="flex flex-col sm:flex-row sm:items-center justify-center gap-2 sm:gap-3 mb-7"
                    >
                        {PASOS_FLUJO.map((paso, indice) => {
                            const activo = paso.estado === 'activo';
                            return (
                                <li key={paso.numero} className="flex items-center gap-2 sm:gap-3">
                                    <div
                                        aria-current={activo ? 'step' : undefined}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition ${
                                            activo
                                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/20'
                                                : 'bg-white border border-slate-200 text-slate-400'
                                        }`}
                                    >
                                        <span className={`font-mono text-[10px] ${activo ? 'text-emerald-100' : 'text-slate-300'}`}>{paso.numero}</span>
                                        <span>{paso.titulo}</span>
                                    </div>
                                    {indice < PASOS_FLUJO.length - 1 && <span className="hidden sm:block text-slate-300" aria-hidden="true">›</span>}
                                </li>
                            );
                        })}
                    </ol>

                    {/* ============================================== */}
                    {/* Caja reactiva de precalificación             */}
                    {/* ============================================== */}
                    <section
                        aria-label="Precalificación orientativa"
                        aria-live="polite"
                        className="mb-7 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5 sm:p-6 shadow-xs"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-sm font-extrabold text-slate-900">Precalificación orientativa</h2>
                                    {precalificacion ? (
                                        <>
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                                                    SEMAFORO_CONFIG[precalificacion.nivel].fondo
                                                } ${SEMAFORO_CONFIG[precalificacion.nivel].texto} ${SEMAFORO_CONFIG[precalificacion.nivel].borde}`}
                                            >
                                                Riesgo {precalificacion.nivel}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                                <Clock className="w-3 h-3" />
                                                {precalificacion.titulo}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                                            Reúne datos
                                        </span>
                                    )}
                                </div>

                                {precalificacion ? (
                                    <ul className="mt-3.5 space-y-1.5">
                                        {precalificacion.factores.map(factor => (
                                            <li key={factor} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                                                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 mt-2" />
                                                {factor}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                                        Completa el área, los pisos o el aforo para ver una orientación preliminar. Puedes dejarlos en blanco si no los conoces con exactitud.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Criterios que el motor habilitará según lo declarado */}
                        <div className="mt-4 pt-4 border-t border-emerald-200/70">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">Criterios que se activarán</span>
                                {CRITERIOS_POR_DECLARACION.map(criterio => {
                                    const estado = data[criterio.campo] as boolean | null | undefined;
                                    const activo = estado === true;
                                    const descartado = estado === false;
                                    return (
                                        <span
                                            key={criterio.codigo}
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition ${
                                                activo
                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                    : descartado
                                                      ? 'bg-white text-slate-400 border-slate-200 line-through'
                                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                            }`}
                                        >
                                            {activo ? <CheckCircle2 className="w-3 h-3" /> : descartado ? <span aria-hidden="true">—</span> : <AlertTriangle className="w-3 h-3" />}
                                            <span className="font-mono">{criterio.codigo}</span>
                                            <span className="font-normal">{criterio.etiqueta}</span>
                                        </span>
                                    );
                                })}
                            </div>

                            {declaracionesPendientes > 0 && (
                                <p className="text-[11px] text-amber-800 mt-2.5 leading-relaxed">
                                    Faltan {declaracionesPendientes} de 4 declaraciones obligatorias. Sin ellas el motor no puede filtrar los criterios que te corresponden.
                                </p>
                            )}

                            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                Orientación calculada en tu navegador a partir de lo que declaras, conforme a los umbrales del{' '}
                                <strong className="font-semibold text-slate-700">Manual CENEPRED (R.J. 016-2018-CENEPRED/J)</strong> y el{' '}
                                <strong className="font-semibold text-slate-700">D.S. 002-2018-PCM</strong>. No se envía ni se registra como clasificación: la
                                determinación formal y los plazos de emisión dependen de cada municipalidad distrital.
                            </p>
                        </div>
                    </section>

                    {/* ============================================== */}
                    {/* Tarjeta Contextual de Sustento Cívico          */}
                    {/* ============================================== */}
                    <div className="mb-7 p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-info-50 text-info-700 border border-info-100 rounded-2xl shrink-0 mt-0.5">
                                <Info className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-sm font-bold text-slate-900">Herramienta de Autoevaluación y Preparación Técnica</h2>
                                    <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">R.J. 016-2018-CENEPRED / D.S. 002-2018-PCM</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-xl">
                                    Plataforma de acceso libre para comerciantes y vecinos de Huancayo. Los resultados corresponden únicamente a lo que tú declaras y no constituyen una
                                    inspección oficial.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowGuia(true)}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-info-800 hover:text-info-900 bg-info-50/60 hover:bg-info-50 border border-info-100 px-3.5 py-2 rounded-xl transition shrink-0 self-end sm:self-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500"
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Ver Base Legal</span>
                        </button>
                    </div>

                    {/* ============================================== */}
                    {/* Banner de Reevaluación Preventiva              */}
                    {/* ============================================== */}
                    {reevaluacionDe && (
                        <div
                            role="note"
                            aria-label="Información de reevaluación preventiva"
                            className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 text-left text-xs sm:text-sm text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shrink-0 mt-0.5">
                                    <RefreshCw className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-white/90 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Nueva Reevaluación Preventiva
                                    </span>
                                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">Reevaluando: {reevaluacionDe.nombre_comercio}</h2>
                                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-2xl">
                                        Los datos del establecimiento han sido precargados desde tu evaluación anterior
                                        {reevaluacionDe.fecha_anterior ? ` del ${reevaluacionDe.fecha_anterior}` : ''}. Tu evaluación previa se conservará sin cambios en tu
                                        historial.
                                    </p>
                                </div>
                            </div>
                            <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                                Trazabilidad independiente
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Alerta de errores de validación backend */}
                        {Object.keys(errors).length > 0 && (
                            <div className="bg-danger-50 border border-danger-300 rounded-2xl p-4 text-left text-sm text-danger-950" role="alert">
                                <div className="flex items-center gap-2 font-bold mb-1">
                                    <AlertCircle className="w-4 h-4 text-danger-600" />
                                    <span>Por favor corrige los siguientes datos:</span>
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 text-xs text-danger-800">
                                    {Object.values(errors).map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* ========================================== */}
                        {/* Tarjeta 1: Datos Generales                */}
                        {/* ========================================== */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left" id="campo-nombre_comercio">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Store className="w-4 h-4 text-emerald-600" /> Identificación y Giro Económico
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="est-nombre" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Nombre Comercial del Establecimiento <span className="text-danger-500" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="est-nombre"
                                        type="text"
                                        required
                                        value={data.nombre_comercio}
                                        onChange={e => {
                                            setData('nombre_comercio', e.target.value);
                                            limpiarErrorDe('nombre_comercio');
                                        }}
                                        placeholder="Ej: Bodega Don Pepe"
                                        aria-invalid={!!(erroresFormulario.nombre_comercio || errors.nombre_comercio)}
                                        aria-describedby={erroresFormulario.nombre_comercio || errors.nombre_comercio ? 'error-nombre' : undefined}
                                        className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none ${
                                            erroresFormulario.nombre_comercio || errors.nombre_comercio ? 'border border-danger-400 bg-danger-50/20' : 'border border-slate-200'
                                        }`}
                                    />
                                    {(erroresFormulario.nombre_comercio || errors.nombre_comercio) && (
                                        <span id="error-nombre" className="text-danger-600 text-xs mt-1 block">
                                            {erroresFormulario.nombre_comercio || errors.nombre_comercio}
                                        </span>
                                    )}
                                </div>

                                <div id="campo-ruc">
                                    <label htmlFor="est-ruc" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        RUC del Titular <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-ruc"
                                        type="text"
                                        maxLength={11}
                                        value={data.ruc}
                                        onChange={e => {
                                            setData('ruc', e.target.value.replace(/\D/g, ''));
                                            limpiarErrorDe('ruc');
                                        }}
                                        placeholder="Ej: 20601234567"
                                        aria-invalid={!!(erroresFormulario.ruc || errors.ruc)}
                                        aria-describedby={erroresFormulario.ruc || errors.ruc ? 'error-ruc' : 'ayuda-ruc'}
                                        className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-sm font-mono font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none ${
                                            erroresFormulario.ruc || errors.ruc ? 'border border-danger-400 bg-danger-50/20' : 'border border-slate-200'
                                        }`}
                                    />
                                    <span id="ayuda-ruc" className="text-xs text-slate-500 mt-1 block">
                                        Opcional. Si no cuentas con RUC, puedes continuar tu autoevaluación libremente.
                                    </span>
                                    {(erroresFormulario.ruc || errors.ruc) && (
                                        <span id="error-ruc" className="text-danger-600 text-xs mt-1 block">
                                            {erroresFormulario.ruc || errors.ruc}
                                        </span>
                                    )}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="est-funcion" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Función Económica (R.J. 016-2018-CENEPRED) <span className="text-danger-500" aria-hidden="true">*</span>
                                    </label>
                                    <select
                                        id="est-funcion"
                                        required
                                        value={data.funcion_economica}
                                        onChange={e => setData('funcion_economica', e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none cursor-pointer"
                                    >
                                        <option value="Comercio">Comercio (Bodegas, Farmacias, Tiendas, Bazares)</option>
                                        <option value="Encuentro">Encuentro (Restaurantes, Cafeterías, Bares, Discotecas)</option>
                                        <option value="Hospedaje">Hospedaje (Hoteles, Hostales)</option>
                                        <option value="Salud">Salud (Consultorios, Clínicas, Laboratorios)</option>
                                        <option value="Educacion">Educación (Colegios, Academias, Nidos)</option>
                                        <option value="Industrial">Industrial (Talleres mecánicos, Carpinterías, Fábricas)</option>
                                        <option value="Oficinas">Oficinas y Servicios Administrativos</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* Tarjeta 2: Escala Física                  */}
                        {/* ========================================== */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-600" /> Escala Física y Capacidad (RNE G.040)
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div id="campo-area_m2">
                                    <label htmlFor="est-area" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Área Techada (m²) <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-area"
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={data.area_m2}
                                        onChange={e => {
                                            setData('area_m2', e.target.value);
                                            limpiarErrorDe('area_m2');
                                        }}
                                        placeholder="Ej: 60"
                                        aria-invalid={!!(erroresFormulario.area_m2 || errors.area_m2)}
                                        aria-describedby={erroresFormulario.area_m2 || errors.area_m2 ? 'error-area' : undefined}
                                        className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none ${
                                            erroresFormulario.area_m2 || errors.area_m2 ? 'border border-danger-400 bg-danger-50/20' : 'border border-slate-200'
                                        }`}
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Orientación: hasta 750 m² suele calificar a ITSE posterior.</span>
                                    {(erroresFormulario.area_m2 || errors.area_m2) && (
                                        <span id="error-area" className="text-danger-600 text-xs mt-1 block">
                                            {erroresFormulario.area_m2 || errors.area_m2}
                                        </span>
                                    )}
                                </div>

                                <div id="campo-pisos">
                                    <label htmlFor="est-pisos" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Número de Pisos <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-pisos"
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={data.pisos}
                                        onChange={e => {
                                            setData('pisos', e.target.value === '' ? '' : parseInt(e.target.value) || '');
                                            limpiarErrorDe('pisos');
                                        }}
                                        placeholder="Ej: 1"
                                        aria-invalid={!!(erroresFormulario.pisos || errors.pisos)}
                                        aria-describedby={erroresFormulario.pisos || errors.pisos ? 'error-pisos' : undefined}
                                        className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none ${
                                            erroresFormulario.pisos || errors.pisos ? 'border border-danger-400 bg-danger-50/20' : 'border border-slate-200'
                                        }`}
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Orientación: hasta 3 pisos suele calificar a ITSE posterior.</span>
                                    {(erroresFormulario.pisos || errors.pisos) && (
                                        <span id="error-pisos" className="text-danger-600 text-xs mt-1 block">
                                            {erroresFormulario.pisos || errors.pisos}
                                        </span>
                                    )}
                                </div>

                                <div id="campo-aforo">
                                    <label htmlFor="est-aforo" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Aforo Estimado <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-aforo"
                                        type="number"
                                        min="1"
                                        value={data.aforo}
                                        onChange={e => {
                                            setData('aforo', e.target.value === '' ? '' : parseInt(e.target.value) || '');
                                            limpiarErrorDe('aforo');
                                        }}
                                        placeholder="Ej: 15"
                                        aria-invalid={!!(erroresFormulario.aforo || errors.aforo)}
                                        aria-describedby={erroresFormulario.aforo || errors.aforo ? 'error-aforo' : undefined}
                                        className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none ${
                                            erroresFormulario.aforo || errors.aforo ? 'border border-danger-400 bg-danger-50/20' : 'border border-slate-200'
                                        }`}
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Personas simultáneas estimadas (clientes + personal).</span>
                                    {(erroresFormulario.aforo || errors.aforo) && (
                                        <span id="error-aforo" className="text-danger-600 text-xs mt-1 block">
                                            {erroresFormulario.aforo || errors.aforo}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* Tarjeta 3: Instalaciones y Condiciones    */}
                        {/* ========================================== */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
                            <div>
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <Flame className="w-4 h-4 text-emerald-600" /> Instalaciones y Condiciones Físicas del Establecimiento
                                    </h3>
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Responde Sí o No en cada condición</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                                    Declara con precisión las características de tu local. El motor de aplicabilidad las utilizará para determinar qué criterios normativos aplican y cuáles
                                    se excluyen de tu evaluación.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {/* 1. GLP (CRIT-10) */}
                                <div
                                    id="campo-usa_glp"
                                    className={`p-4 rounded-2xl transition ${
                                        erroresFormulario.usa_glp ? 'bg-danger-50/40 border border-danger-300' : 'bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <span id="label-usa_glp" className="text-xs font-bold text-slate-800 block">
                                                ¿Usa Gas Licuado de Petróleo (GLP)? <span className="text-danger-500">*</span>
                                            </span>
                                            <span id="desc-usa_glp" className="text-xs text-slate-500">
                                                Balones o tanques de GLP para cocción o proceso comercial (determina aplicabilidad de CRIT-10).
                                            </span>
                                        </div>
                                        <div
                                            role="group"
                                            aria-labelledby="label-usa_glp"
                                            aria-describedby="desc-usa_glp"
                                            className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0"
                                        >
                                            <button
                                                type="button"
                                                aria-pressed={data.usa_glp === false}
                                                onClick={() => {
                                                    setData('usa_glp', false);
                                                    setData('galones_glp', '');
                                                    limpiarErrorDe('usa_glp');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.usa_glp === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={data.usa_glp === true}
                                                onClick={() => {
                                                    setData('usa_glp', true);
                                                    limpiarErrorDe('usa_glp');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.usa_glp === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>

                                    {erroresFormulario.usa_glp && (
                                        <span className="text-danger-600 text-xs mt-2 block font-medium">{erroresFormulario.usa_glp}</span>
                                    )}

                                    {data.usa_glp === true && (
                                        <div className="mt-3 pt-3 border-t border-amber-200/60 p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                                            <label htmlFor="est-galones" className="block text-xs font-bold uppercase text-amber-900 mb-1">
                                                Cantidad Total Estimada de GLP (Galones) <span className="font-semibold normal-case tracking-normal text-amber-700">(opcional)</span>
                                            </label>
                                            <input
                                                id="est-galones"
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={data.galones_glp}
                                                onChange={e => setData('galones_glp', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                placeholder="Ej: 10"
                                                className="w-full sm:w-48 px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                                            />
                                            <span className="text-xs text-amber-800 block mt-1">
                                                Indica la cantidad estimada en galones si cuentas con dicha información.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 2. Equipos de fritura / cocción con aceites (CRIT-02A) */}
                                <div
                                    id="campo-tiene_equipos_fritura"
                                    className={`p-4 rounded-2xl transition ${
                                        erroresFormulario.tiene_equipos_fritura ? 'bg-danger-50/40 border border-danger-300' : 'bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <UtensilsCrossed className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span id="label-tiene_equipos_fritura" className="text-xs font-bold text-slate-800 block">
                                                    ¿Cuenta con freidoras o cocción con aceites y grasas? <span className="text-danger-500">*</span>
                                                </span>
                                                <span id="desc-tiene_equipos_fritura" className="text-xs text-slate-500">
                                                    Determina la exigencia de extintor especializado Clase K (CRIT-02A).
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            role="group"
                                            aria-labelledby="label-tiene_equipos_fritura"
                                            aria-describedby="desc-tiene_equipos_fritura"
                                            className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0"
                                        >
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_equipos_fritura === false}
                                                onClick={() => {
                                                    setData('tiene_equipos_fritura', false);
                                                    limpiarErrorDe('tiene_equipos_fritura');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_equipos_fritura === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_equipos_fritura === true}
                                                onClick={() => {
                                                    setData('tiene_equipos_fritura', true);
                                                    limpiarErrorDe('tiene_equipos_fritura');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_equipos_fritura === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>

                                    {erroresFormulario.tiene_equipos_fritura && (
                                        <span className="text-danger-600 text-xs mt-2 block font-medium">{erroresFormulario.tiene_equipos_fritura}</span>
                                    )}
                                </div>

                                {/* 3. Escaleras de circulación (CRIT-11) */}
                                <div
                                    id="campo-tiene_escaleras"
                                    className={`p-4 rounded-2xl transition ${
                                        erroresFormulario.tiene_escaleras ? 'bg-danger-50/40 border border-danger-300' : 'bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <Footprints className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span id="label-tiene_escaleras" className="text-xs font-bold text-slate-800 block">
                                                    ¿El local cuenta con escaleras de circulación? <span className="text-danger-500">*</span>
                                                </span>
                                                <span id="desc-tiene_escaleras" className="text-xs text-slate-500">
                                                    Determina la exigencia de pasamanos y peldaños antideslizantes (CRIT-11).
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            role="group"
                                            aria-labelledby="label-tiene_escaleras"
                                            aria-describedby="desc-tiene_escaleras"
                                            className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0"
                                        >
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_escaleras === false}
                                                onClick={() => {
                                                    setData('tiene_escaleras', false);
                                                    limpiarErrorDe('tiene_escaleras');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_escaleras === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_escaleras === true}
                                                onClick={() => {
                                                    setData('tiene_escaleras', true);
                                                    limpiarErrorDe('tiene_escaleras');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_escaleras === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>

                                    {erroresFormulario.tiene_escaleras && <span className="text-danger-600 text-xs mt-2 block font-medium">{erroresFormulario.tiene_escaleras}</span>}
                                </div>

                                {/* 4. Estanterías altas o mobiliario alto (CRIT-13) */}
                                <div
                                    id="campo-tiene_estanterias_altas"
                                    className={`p-4 rounded-2xl transition ${
                                        erroresFormulario.tiene_estanterias_altas ? 'bg-danger-50/40 border border-danger-300' : 'bg-slate-50 border border-slate-100'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <Package className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span id="label-tiene_estanterias_altas" className="text-xs font-bold text-slate-800 block">
                                                    ¿Cuenta con estanterías altas o mobiliario con riesgo de volteo? <span className="text-danger-500">*</span>
                                                </span>
                                                <span id="desc-tiene_estanterias_altas" className="text-xs text-slate-500">
                                                    Determina la exigencia de arriostramiento antisísmico a pared o piso (CRIT-13).
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            role="group"
                                            aria-labelledby="label-tiene_estanterias_altas"
                                            aria-describedby="desc-tiene_estanterias_altas"
                                            className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0"
                                        >
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_estanterias_altas === false}
                                                onClick={() => {
                                                    setData('tiene_estanterias_altas', false);
                                                    limpiarErrorDe('tiene_estanterias_altas');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_estanterias_altas === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={data.tiene_estanterias_altas === true}
                                                onClick={() => {
                                                    setData('tiene_estanterias_altas', true);
                                                    limpiarErrorDe('tiene_estanterias_altas');
                                                }}
                                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                                                    data.tiene_estanterias_altas === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>

                                    {erroresFormulario.tiene_estanterias_altas && (
                                        <span className="text-danger-600 text-xs mt-2 block font-medium">{erroresFormulario.tiene_estanterias_altas}</span>
                                    )}
                                </div>

                                {/* Condiciones adicionales secundarias */}
                                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Caldero */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 block">¿Cuenta con caldero?</span>
                                            <span className="text-xs text-slate-500">Calderas industriales o de vapor.</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setData('usa_caldero', false)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                    data.usa_caldero === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('usa_caldero', true)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                    data.usa_caldero === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>

                                    {/* Líquidos Inflamables */}
                                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 block">¿Almacena líquidos o reactivos inflamables?</span>
                                            <span className="text-xs text-slate-500">Thinner, pinturas, solventes o combustibles.</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setData('usa_liquidos_inflamables', false)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                    data.usa_liquidos_inflamables === false ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                No
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('usa_liquidos_inflamables', true)}
                                                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                                                    data.usa_liquidos_inflamables === true ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                                                }`}
                                            >
                                                Sí
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ========================================== */}
                        {/* Tarjeta 4: Ubicación del Establecimiento   */}
                        {/* ========================================== */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs text-left">
                            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600" /> Ubicación del Establecimiento
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="est-direccion" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Dirección <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-direccion"
                                        type="text"
                                        maxLength={255}
                                        value={data.direccion}
                                        onChange={e => setData('direccion', e.target.value)}
                                        placeholder="Ej: Jr. Ancash 345, Huancayo"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                                    />
                                    <span className="text-xs text-slate-500 mt-1 block">Ayuda a identificar tu local; aparecerá en tu resumen y registro.</span>
                                </div>

                                <div>
                                    <label htmlFor="est-referencia" className="block text-xs font-bold uppercase text-slate-500 mb-1">
                                        Referencia <span className="font-semibold normal-case tracking-normal text-slate-400">(opcional)</span>
                                    </label>
                                    <input
                                        id="est-referencia"
                                        type="text"
                                        maxLength={255}
                                        value={data.referencia}
                                        onChange={e => setData('referencia', e.target.value)}
                                        placeholder="Ej: frente al parque Huamanmarca"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones de Navegación y Envío */}
                        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Volver a la portada</span>
                            </Link>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-8 py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <span>{processing ? 'Iniciando autoevaluación...' : 'Continuar al Simulacro en vivo'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
