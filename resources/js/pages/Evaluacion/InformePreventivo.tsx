import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';
import { CATEGORIA_LABELS, CHECKLIST_CATALOGO_OFICIAL, type CategoriaChecklist } from '@/data/checklistCatalogo';
import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    ExternalLink,
    FileCheck,
    FileText,
    Fingerprint,
    Gauge,
    Hash,
    Info,
    Layers,
    MapPin,
    MinusCircle,
    Ruler,
    Scale,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { etiquetaEstado } from '@/data/estados';
import { formatearNivelRiesgo } from '@/lib/riesgo';
import type {
    CondicionChecklist,
    ConteoEstados,
    FilaMatriz,
    InformePreventivoProps,
} from '@/types/contrato';


function getCategoriaNombre(categoria?: string): string {
    if (!categoria) {
        return 'Seguridad General';
    }
    if (categoria in CATEGORIA_LABELS) {
        return CATEGORIA_LABELS[categoria as CategoriaChecklist];
    }
    return categoria;
}

function getEstadoBadge(estado: string) {
    const estadoNormalizado = estado?.toUpperCase() ?? 'NA';
    switch (estadoNormalizado) {
        case 'CUMPLE':
            return {
                label: 'CUMPLE',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                icon: CheckCircle2,
            };
        case 'NO_CUMPLE':
            return {
                label: 'NO CUMPLE',
                bg: 'bg-rose-50 text-rose-800 border-rose-200',
                icon: AlertCircle,
            };
        case 'POR_REVISAR':
            return {
                label: 'POR REVISAR',
                bg: 'bg-amber-50 text-amber-800 border-amber-200',
                icon: AlertTriangle,
            };
        case 'NA':
        default:
            return {
                label: 'NO APLICA',
                bg: 'bg-slate-100 text-slate-600 border-slate-200',
                icon: MinusCircle,
            };
    }
}

export default function InformePreventivo({
    autoevaluacion,
    esReevaluacion = false,
    evaluacionOrigen = null,
    codigoInforme,
    fechaEmision,
    resumen,
    detalleChecklist,
    conteoEstados,
    matrizSubsanaciones,
    hashFinal,
    hashIntegridad,
}: Readonly<InformePreventivoProps>) {
    const urlSeguimiento = `/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`;

    const esExAnte = autoevaluacion.tipo_tramite === 'EX_ANTE';
    const nivelRiesgoLegible = formatearNivelRiesgo(autoevaluacion.nivel_riesgo);
    const gapFinal = `${resumen.gap_final.toFixed(1)}%`;

    const esImagenEvidencia = (archivo?: string | null) => !!archivo && /\.(png|jpe?g|webp)$/i.test(archivo);

    // Matriz completa enriquecida de condiciones evaluadas
    const listaCondiciones = useMemo<CondicionChecklist[]>(() => {
        if (detalleChecklist && detalleChecklist.length > 0) {
            return detalleChecklist;
        }

        const raw = autoevaluacion.detalle_checklist || [];
        return raw.map((item) => {
            const catalogo = CHECKLIST_CATALOGO_OFICIAL.find((c) => c.codigo === item.codigo);
            const estado = item.estado ?? (item.cumple ? 'CUMPLE' : 'NO_CUMPLE');

            return {
                codigo: item.codigo,
                nombre: item.nombre || catalogo?.nombre || item.codigo,
                categoria: item.categoria || (catalogo?.categoria ? CATEGORIA_LABELS[catalogo.categoria] : 'Seguridad General'),
                estado,
                cumple: estado === 'CUMPLE',
                es_critico: Boolean(item.es_critico ?? catalogo?.es_critico ?? false),
                norma: item.norma || catalogo?.norma || 'Normativa ITSE / CENEPRED',
            };
        });
    }, [detalleChecklist, autoevaluacion.detalle_checklist]);

    // Resumen cuantitativo por estado de las condiciones
    const conteo = useMemo<ConteoEstados>(() => {
        if (conteoEstados) {
            return conteoEstados;
        }

        return {
            total: listaCondiciones.length,
            cumple: listaCondiciones.filter((c) => c.estado === 'CUMPLE').length,
            no_cumple: listaCondiciones.filter((c) => c.estado === 'NO_CUMPLE').length,
            por_revisar: listaCondiciones.filter((c) => c.estado === 'POR_REVISAR').length,
            na: listaCondiciones.filter((c) => c.estado === 'NA').length,
        };
    }, [conteoEstados, listaCondiciones]);

    // Información descriptiva y preventiva del semáforo
    const semaforoInfo = useMemo(() => {
        const sem = autoevaluacion.semaforo?.toUpperCase() ?? 'VERDE';
        if (sem === 'VERDE') {
            return {
                dotColor: 'bg-emerald-600',
                textColor: 'text-emerald-600',
                label: 'VERDE — Sin incumplimientos declarados',
                desc: 'Según las respuestas registradas en esta autoevaluación, no se consignaron observaciones técnicas pendientes.',
            };
        }
        if (sem === 'AMBAR' || sem === 'ÁMBAR') {
            return {
                dotColor: 'bg-amber-500',
                textColor: 'text-amber-600',
                label: 'ÁMBAR — Presenta aspectos por revisar',
                desc: 'Presenta condiciones técnicas observadas o pendientes de verificación previa a una inspección oficial.',
            };
        }
        return {
            dotColor: 'bg-rose-600',
            textColor: 'text-rose-600',
            label: 'ROJO — Requiere atención prioritaria',
            desc: 'Se identificaron condiciones de seguridad críticas declaradas como no conformes que requieren subsanación urgente.',
        };
    }, [autoevaluacion.semaforo]);

    const es100Cumplimiento =
        autoevaluacion.porcentaje_cumplimiento >= 100 &&
        conteo.no_cumple === 0 &&
        conteo.por_revisar === 0;

    const resolverSubtipoTramite = (tipoTramite?: string | null, exAnte?: boolean): string => {
        if (!tipoTramite) {
            return 'Evaluación preventiva';
        }
        return exAnte ? 'ITSE Previa (Ex-Ante)' : 'ITSE Posterior (Ex-Post)';
    };

    const renderEvidenciaAdjunta = (fila: FilaMatriz) => {
        if (!fila.evidencia_url) {
            return (
                <span className="mt-1 block text-[10px] text-slate-400">
                    Sin evidencia declarada
                </span>
            );
        }

        if (esImagenEvidencia(fila.evidencia_archivo)) {
            return (
                <a
                    href={fila.evidencia_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block"
                >
                    <img
                        src={fila.evidencia_url}
                        alt={`Evidencia declarada de ${fila.codigo_item}`}
                        className="max-h-20 w-full rounded-md border border-slate-200 object-contain break-inside-avoid"
                    />
                </a>
            );
        }

        return (
            <a
                href={fila.evidencia_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800 hover:underline break-inside-avoid"
            >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">Ver documento</span>
            </a>
        );
    };

    const datosGenerales: Array<{ icon: LucideIcon; label: string; value: string; sub?: string }> = [
        {
            icon: Building2,
            label: 'Nombre Comercial',
            value: autoevaluacion.nombre_comercio,
            sub: `Giro declarado: ${autoevaluacion.funcion_economica}`,
        },
        {
            icon: Fingerprint,
            label: 'RUC',
            value: autoevaluacion.ruc ?? 'No declarado',
            sub: 'Contribuyente declarante',
        },
        {
            icon: MapPin,
            label: 'Ubicación en Huancayo',
            value: autoevaluacion.sector_huancayo ?? 'No declarado',
            sub: 'Referencia territorial declarada',
        },
        {
            icon: Ruler,
            label: 'Área Techada',
            value: `${autoevaluacion.area_m2} m²`,
            sub: `${autoevaluacion.pisos} piso(s)`,
        },
        {
            icon: Users,
            label: 'Aforo Estimado',
            value: `${autoevaluacion.aforo} pers.`,
            sub: 'Capacidad declarada',
        },
        ...(autoevaluacion.nivel_riesgo || autoevaluacion.tipo_tramite ? [{
            icon: Scale,
            label: 'Riesgo Declarado',
            value: nivelRiesgoLegible,
            sub: resolverSubtipoTramite(autoevaluacion.tipo_tramite, esExAnte),
        }] : []),
    ];

    const metricas: Array<{ icon: LucideIcon; label: string; value: string; sub: string }> = [
        {
            icon: Layers,
            label: 'Condiciones Evaluadas',
            value: `${resumen.total_condiciones}`,
            sub: 'Ítems técnicos detectables',
        },
        {
            icon: CheckCircle2,
            label: 'Conformes Iniciales',
            value: `${resumen.conformes_iniciales}`,
            sub: 'Al momento de la autoevaluación',
        },
        {
            icon: FileCheck,
            label: 'Subsanadas Declaradas',
            value: `${resumen.subsanadas_declaradas}`,
            sub: `${resumen.en_proceso} en proceso · ${resumen.pendientes} pendientes`,
        },
        {
            icon: Gauge,
            label: 'GAP Final de Preparación',
            value: gapFinal,
            sub: 'Asimetría informativa del ciclo',
        },
    ];

    const tieneSubsanaciones = matrizSubsanaciones.length > 0;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <Head
                title={`${
                    esReevaluacion ? 'Informe Preventivo Reevaluación' : 'Informe de Autoevaluación Preventiva ITSE'
                } - ${autoevaluacion.nombre_comercio}`}
            />

            {/* Acciones de pantalla */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    href={urlSeguimiento}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 transition-colors hover:text-slate-900"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver al Resultado
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    <a
                        href={urlSeguimiento}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
                    >
                        <span>Gestionar subsanaciones en la plataforma</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>

            {/* Hoja del informe */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
                    {/* Marca de agua */}
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none"
                        aria-hidden="true"
                    >
                        <ShieldCheck className="h-[460px] w-[460px] text-emerald-600" />
                    </div>

                    {/* Contenido de la hoja */}
                    <div className="relative space-y-5 p-6 sm:p-10 md:p-12">
                        {/* 1. Encabezado + aviso legal */}
                        <header className="border-b-2 border-double border-emerald-600/80 pb-5">
                            <div className="mb-3 flex justify-center">
                                <span className="rounded-xl bg-emerald-600 p-2.5 text-white">
                                    <ShieldCheck className="h-7 w-7" />
                                </span>
                            </div>
                            <span className="block text-center text-[10px] font-bold tracking-[0.22em] text-emerald-600 uppercase">
                                Asistente Cívico CheckITSE Huancayo
                            </span>

                            <h1 className="mt-2 text-center text-lg leading-snug font-black tracking-tight text-slate-900 uppercase sm:text-2xl">
                                {esReevaluacion
                                    ? 'Informe Preventivo — Reevaluación'
                                    : 'Informe de Autoevaluación Preventiva ITSE'}
                            </h1>

                            {/* Nota contextual si es reevaluación */}
                            {esReevaluacion && (
                                <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50/80 p-3 text-left">
                                    <div className="flex items-start gap-2">
                                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                                        <div className="text-[11px] leading-relaxed text-sky-900">
                                            <strong className="font-bold">Nota contextual de reevaluación:</strong>{' '}
                                            Este informe corresponde a una <strong>reevaluación preventiva</strong>{' '}
                                            del establecimiento.
                                            {evaluacionOrigen?.uuid_trazabilidad && (
                                                <span>
                                                    {' '}
                                                    Evaluación original de referencia: UUID{' '}
                                                    <span className="font-mono font-semibold">
                                                        {evaluacionOrigen.uuid_trazabilidad}
                                                    </span>
                                                    {evaluacionOrigen.fecha && ` (${evaluacionOrigen.fecha})`}.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Referencia al marco legal */}
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                    D.S. N° 002-2018-PCM
                                </span>
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                    R.J. N° 016-2018-CENEPRED/J
                                </span>
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                                    RNE A.010 / A.130 · CNE-U
                                </span>
                            </div>

                            {/* Código de informe y fecha */}
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-50/70 px-3 py-1.5">
                                    <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                                        N° de Informe:
                                    </span>
                                    <span className="font-mono text-xs font-black text-emerald-600">
                                        {codigoInforme}
                                    </span>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Fecha:</span>
                                    <span className="font-mono text-[11px] font-bold text-slate-800">
                                        {fechaEmision}
                                    </span>
                                </div>
                            </div>

                            {/* Sello Criptográfico SHA-256 e Integridad */}
                            {(hashIntegridad || hashFinal) && (
                                <div className="mt-3 flex justify-center">
                                    <CryptoSealBadge
                                        hash={hashIntegridad || hashFinal}
                                        fecha={fechaEmision}
                                        esInmutable={true}
                                    />
                                </div>
                            )}

                            {/* Descargo legal de no-oficialidad prominente */}
                            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-left">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                    <div className="text-[10px] leading-relaxed text-amber-950">
                                        <strong className="block font-bold uppercase tracking-wider text-amber-900">
                                            Aviso Preventivo Importante — No Oficial
                                        </strong>
                                        Este documento es de carácter estrictamente informativo, educativo y preventivo.
                                        Ha sido generado de forma automatizada a partir de las declaraciones voluntarias
                                        del responsable del establecimiento.{' '}
                                        <strong>
                                            No constituye certificado de ITSE, no otorga aprobación ni autorización
                                             municipal, y no convalida condiciones de seguridad ante ninguna autoridad u
                                             órgano ejecutante.
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* 2. Datos generales declarados del establecimiento */}
                        <section>
                            <div className="mb-2.5 flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-emerald-600" />
                                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                    Datos Generales Declarados del Establecimiento
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                                {datosGenerales.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                                    >
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                            <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                {item.label}
                                            </span>
                                        </div>
                                        <p className="text-xs leading-snug font-bold break-words text-slate-900">
                                            {item.value}
                                        </p>
                                        <p className="mt-0.5 text-[9px] text-slate-400">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. Resumen de diagnóstico */}
                        <section>
                            <div className="mb-2.5 flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-emerald-600" />
                                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                    Resumen de Diagnóstico Preventivo
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
                                        <span
                                            className={`h-3 w-3 shrink-0 rounded-full ${semaforoInfo.dotColor}`}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                Semáforo Preventivo
                                            </span>
                                            <span className={`text-sm font-black ${semaforoInfo.textColor}`}>
                                                {autoevaluacion.semaforo}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            GAP Final de Preparación
                                        </span>
                                        <span className="text-sm font-black text-emerald-600">{gapFinal}</span>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                            Subsanación Declarada
                                        </span>
                                        <span className="text-sm font-black text-emerald-600">
                                            {resumen.porcentaje_subsanado}%
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-left">
                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                        Diagnóstico Declarado
                                    </span>
                                    <p className="mt-0.5 text-xs font-bold text-slate-800">{semaforoInfo.label}</p>
                                    <p className="mt-0.5 text-[10px] text-slate-600">{semaforoInfo.desc}</p>
                                    {es100Cumplimiento && (
                                        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-[10px] text-emerald-600">
                                            <strong>Nota de conformidad declarada:</strong> Según las respuestas
                                            declaradas en esta autoevaluación, no se identificaron incumplimientos
                                            declarados en las condiciones evaluadas. Este informe tiene carácter
                                            preventivo y no sustituye la inspección oficial ITSE.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                                {metricas.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl border border-slate-200 bg-white p-3"
                                    >
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                            <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                {item.label}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-snug font-black text-slate-900">{item.value}</p>
                                        <p className="mt-0.5 text-[9px] text-slate-400">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. Matriz Completa de Condiciones Evaluadas (Checklist Integral) */}
                        <section>
                            <div className="mb-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-emerald-600" />
                                    <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                        Matriz Completa de Condiciones Evaluadas ({conteo.total})
                                    </h2>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500">
                                    Diagnóstico Integral por Condición
                                </span>
                            </div>

                            {/* Resumen cuantitativo por estado */}
                            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                        Total
                                    </span>
                                    <span className="text-sm font-black text-slate-900">{conteo.total}</span>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-center">
                                    <span className="block text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                                        Cumple
                                    </span>
                                    <span className="text-sm font-black text-emerald-600">{conteo.cumple}</span>
                                </div>
                                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-2.5 text-center">
                                    <span className="block text-[9px] font-bold tracking-wider text-rose-600 uppercase">
                                        No Cumple
                                    </span>
                                    <span className="text-sm font-black text-rose-600">{conteo.no_cumple}</span>
                                </div>
                                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 text-center">
                                    <span className="block text-[9px] font-bold tracking-wider text-amber-600 uppercase">
                                        Por Revisar
                                    </span>
                                    <span className="text-sm font-black text-amber-600">{conteo.por_revisar}</span>
                                </div>
                                <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-100/70 p-2.5 text-center sm:col-span-1">
                                    <span className="block text-[9px] font-bold tracking-wider text-slate-600 uppercase">
                                        No Aplica
                                    </span>
                                    <span className="text-sm font-black text-slate-700">{conteo.na}</span>
                                </div>
                            </div>

                            {/* Lista de todas las condiciones de la autoevaluación */}
                            <div className="space-y-2">
                                {listaCondiciones.map((item, idx) => {
                                    const badge = getEstadoBadge(item.estado);
                                    const BadgeIcon = badge.icon;
                                    const catNombre = getCategoriaNombre(item.categoria);

                                    return (
                                        <div
                                            key={`${item.codigo}-${idx}`}
                                            className="rounded-xl border border-slate-200 bg-white p-3"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs font-black text-slate-800">
                                                        {item.codigo}
                                                    </span>
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                                        {catNombre}
                                                    </span>
                                                    {item.es_critico && (
                                                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800">
                                                            Crítico
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}
                                                >
                                                    <BadgeIcon className="h-3 w-3" />
                                                    <span>{badge.label}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-xs leading-snug font-semibold text-slate-900">
                                                    {item.nombre}
                                                </p>
                                                {item.norma && (
                                                    <p className="mt-1 font-mono text-[9px] text-slate-400">
                                                        Ref: {item.norma}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* 5. Matriz de trazabilidad de subsanaciones */}
                        <section>
                            <div className="mb-2.5 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-emerald-600" />
                                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                    Matriz de Trazabilidad de Subsanaciones y Adecuaciones
                                </h2>
                            </div>

                            <div
                                role="note"
                                aria-label="Naturaleza preventiva de las evidencias declaradas"
                                className="mb-2.5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] leading-relaxed text-sky-900"
                            >
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                <p>
                                    Evidencias <strong>declaradas por el ciudadano</strong>, no verificadas
                                    oficialmente por la autoridad competente. Su trazabilidad es preventiva.
                                </p>
                            </div>

                            {!tieneSubsanaciones ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                                    <span className="text-[11px] text-slate-500">
                                        Sin adecuaciones ni subsanaciones declaradas registradas en esta autoevaluación.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {matrizSubsanaciones.map((fila) => (
                                        <div
                                            key={fila.codigo_item}
                                            className="overflow-hidden rounded-2xl border border-slate-200"
                                        >
                                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                                                <span className="font-mono text-xs font-black text-danger-900">
                                                    {fila.codigo_item}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {etiquetaEstado(fila.estado)} ·{' '}
                                                    {fila.fecha_subsanacion ?? 'Sin fecha'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_1.4fr_1fr]">
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                        Deficiencia Inicial
                                                    </span>
                                                    <p className="mt-0.5 text-[11px] leading-snug font-semibold text-slate-800">
                                                        {fila.deficiencia_inicial}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                        Acción Realizada
                                                    </span>
                                                    <p className="mt-0.5 text-[11px] leading-snug text-slate-700">
                                                        {fila.accion_realizada}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                                        Evidencia Adjunta
                                                    </span>
                                                    {renderEvidenciaAdjunta(fila)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Cuerpo del informe */}
                        <div className="space-y-3 text-justify text-xs leading-relaxed text-slate-700 sm:text-sm">
                            <p>
                                El titular del establecimiento <strong>"{autoevaluacion.nombre_comercio}"</strong>,
                                identificado con <strong>RUC N° {autoevaluacion.ruc}</strong>, ubicado en el sector
                                territorial <strong>{autoevaluacion.sector_huancayo}</strong> de la provincia de
                                Huancayo, con un área techada de <strong>{autoevaluacion.area_m2} m²</strong>,{' '}
                                <strong>{autoevaluacion.pisos} piso(s)</strong> y aforo estimado para{' '}
                                <strong>{autoevaluacion.aforo} personas</strong>, ha completado voluntariamente el ciclo
                                de autoevaluación preventiva: revisión de condiciones técnicas, simulación de revisión
                                in situ y plan de adecuaciones declaradas, con un GAP final de preparación del{' '}
                                <strong>{gapFinal}</strong>.
                            </p>
                            <p>
                                Las condiciones técnicas fueron revisadas por el propio titular usando como referencia
                                la <strong>R.J. N° 016-2018-CENEPRED</strong>, el <strong>D.S. N° 002-2018-PCM</strong>, el
                                Reglamento Nacional de Edificaciones (Normas <strong>A.010</strong> y{' '}
                                <strong>A.130</strong>) y el Código Nacional de Electricidad (<strong>CNE-U</strong>).
                                Por tratarse de una declaración personal, este informe{' '}
                                <strong>no garantiza ni anticipa</strong> el resultado de la inspección oficial, cuya
                                evaluación corresponde a la autoridad municipal competente.
                            </p>
                        </div>

                        {/* Declaración del responsable del establecimiento */}
                        <div className="flex flex-col items-center justify-center pt-6 text-center">
                            <div className="w-72 border-t border-slate-400 pt-2">
                                <span className="block text-[10px] font-bold text-slate-800 uppercase">
                                    Declaración del responsable del establecimiento
                                </span>
                                <span className="text-[9px] text-slate-500">
                                    {autoevaluacion.nombre_comercio} · RUC {autoevaluacion.ruc}
                                </span>
                            </div>
                            <p className="mt-2 max-w-md text-[9px] leading-relaxed text-slate-500">
                                La presente declaración es de carácter personal y preventivo. No sustituye la inspección
                                técnica de seguridad en edificaciones (ITSE) realizada por el órgano ejecutante
                                competente ni convalida el cumplimiento normativo ante la municipalidad.
                            </p>
                        </div>

                        {/* 6. Pie de página pericial preventivo: huella criptográfica */}
                        <section className="rounded-2xl border border-slate-200 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <Hash className="h-4 w-4 text-emerald-600" />
                                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                                    Trazabilidad Pericial Preventiva
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="flex items-start gap-2">
                                    <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-700 uppercase">
                                            UUID de Trazabilidad
                                        </span>
                                        <span className="font-mono break-all text-slate-900 select-all">
                                            {autoevaluacion.uuid_trazabilidad}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-slate-700 uppercase">
                                            Fecha de Generación
                                        </span>
                                        <span className="font-mono text-slate-900">{fechaEmision}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                                    <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                    <div>
                                        <span className="block text-[9px] font-bold tracking-wider text-emerald-600 uppercase">
                                            Estado del Registro
                                        </span>
                                        <span className="text-xs font-black text-emerald-600">
                                            Autoevaluación registrada según las respuestas declaradas
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                <div className="rounded-xl bg-slate-900 p-3 font-mono text-slate-300">
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                            Hash SHA-256 del Registro
                                        </span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed break-all select-all">{hashIntegridad}</p>
                                </div>
                                <div className="rounded-xl bg-slate-900 p-3 font-mono text-slate-300">
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-[10px] tracking-wider text-slate-400 uppercase">
                                            Huella Criptográfica del Payload Consolidado
                                        </span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed break-all select-all">{hashFinal}</p>
                                </div>
                            </div>
                        </section>

                        {/* Pie de la hoja */}
                        <div className="flex items-start gap-2 border-t border-slate-200 pt-3 text-center">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <p className="text-[9px] text-slate-500">
                                Informe cívico de autoevaluación generado por el asistente CheckITSE Huancayo. Su
                                verificación queda respaldada por el bloque de trazabilidad criptográfica. Este
                                documento es de carácter preventivo e informativo y no constituye un documento oficial.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
}
