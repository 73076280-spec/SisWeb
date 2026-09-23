import { GuiaModal } from '@/components/GuiaModal';
import { Navbar } from '@/components/Navbar';
import { Head, Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    ArrowLeft,
    Building2,
    CalendarClock,
    CheckCircle2,
    ExternalLink,
    FileCheck,
    FileText,
    Fingerprint,
    Gauge,
    Hash,
    Layers,
    MapPin,
    Printer,
    QrCode,
    Ruler,
    Scale,
    ShieldCheck,
    Stamp,
    Users,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface AutoevaluacionProps {
    uuid_trazabilidad: string;
    hash_integridad: string;
    nombre_comercio: string;
    funcion_economica: string;
    ruc: string;
    sector_huancayo: string;
    area_m2: number;
    pisos: number;
    aforo: number;
    tipo_tramite: string;
    nivel_riesgo: string;
    semaforo: string;
    porcentaje_cumplimiento: number;
}

interface FilaMatriz {
    codigo_item: string;
    nombre_condicion: string;
    deficiencia_inicial: string;
    accion_realizada: string;
    estado: string;
    evidencia_url: string | null;
    fecha_subsanacion: string | null;
}

interface ResumenProps {
    total_condiciones: number;
    conformes_iniciales: number;
    subsanadas_declaradas: number;
    en_proceso: number;
    pendientes: number;
    gap_final: number;
    porcentaje_subsanado: number;
}

interface Props {
    autoevaluacion: AutoevaluacionProps;
    codigoInforme: string;
    fechaEmision: string;
    resumen: ResumenProps;
    matrizSubsanaciones: FilaMatriz[];
    hashFinal: string;
    hashIntegridad: string;
}

export default function InformePreventivo({
    autoevaluacion,
    codigoInforme,
    fechaEmision,
    resumen,
    matrizSubsanaciones,
    hashFinal,
    hashIntegridad,
}: Props) {
    const [showGuia, setShowGuia] = useState<boolean>(false);

    const urlSeguimiento =
        typeof window !== 'undefined'
            ? `${window.location.origin}/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`
            : `/autoevaluacion/resultado/${autoevaluacion.uuid_trazabilidad}`;

    const esExAnte = autoevaluacion.tipo_tramite === 'EX_ANTE';
    const nivelRiesgoLegible = autoevaluacion.nivel_riesgo.split('_').join(' ');
    const gapFinal = `${resumen.gap_final.toFixed(1)}%`;

    const esImagenEvidencia = (url: string) => /\.(png|jpe?g)$/i.test(url);

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
            value: autoevaluacion.ruc,
            sub: 'Contribuyente declarante',
        },
        {
            icon: MapPin,
            label: 'Ubicación en Huancayo',
            value: autoevaluacion.sector_huancayo,
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
        {
            icon: Scale,
            label: 'Riesgo Declarado',
            value: nivelRiesgoLegible,
            sub: esExAnte ? 'ITSE Previa (Ex-Ante)' : 'ITSE Posterior (Ex-Post)',
        },
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

    return (
        <div className="flex min-h-screen flex-col justify-between bg-[#F4F4F5] font-sans text-neutral-900 antialiased print:bg-white print:py-0">
            <Head title={`Informe de Autoevaluación Preventiva ITSE - ${autoevaluacion.nombre_comercio}`} />

            {/* Barra de navegación y modal de base legal — ocultos al imprimir */}
            <div className="print:hidden">
                <Navbar />
                <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
            </div>

            <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10 print:max-w-none print:p-0">
                {/* Acciones de pantalla — ocultas al imprimir */}
                <div className="mb-6 flex items-center justify-between print:hidden">
                    <Link
                        href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`}
                        className="flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-neutral-900"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al Panel
                    </Link>

                    <button
                        onClick={() => window.print()}
                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                    >
                        <Printer className="h-4 w-4" /> Imprimir / Guardar como PDF
                    </button>
                </div>

                {/* Hoja del informe (formato A4) */}
                <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lg print:rounded-none print:border-none print:p-0 print:shadow-none">
                    {/* Marca de agua */}
                    <div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03] select-none"
                        aria-hidden="true"
                    >
                        <ShieldCheck className="h-[460px] w-[460px] text-emerald-950" />
                    </div>

                    {/* Contenido de la hoja */}
                    <div className="relative space-y-5 p-6 sm:p-10 md:p-12 print:space-y-4 print:p-8">
                        {/* 1. Encabezado + descargo legal */}
                        <header className="border-b-2 border-double border-emerald-900/80 pb-5 print:pb-4">
                            <div className="mb-3 flex justify-center">
                                <span className="rounded-xl bg-emerald-900 p-2.5 text-white">
                                    <ShieldCheck className="h-7 w-7" />
                                </span>
                            </div>
                            <span className="block text-center text-[10px] font-bold tracking-[0.22em] text-emerald-900 uppercase">
                                Asistente Cívico CheckITSE Huancayo
                            </span>

                            <h1 className="mt-2 text-center text-lg leading-snug font-black tracking-tight text-neutral-900 uppercase sm:text-2xl">
                                Informe de Autoevaluación Preventiva ITSE
                            </h1>

                            {/* Referencia al marco legal */}
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-600">
                                    D.S. N° 002-2018-PCM
                                </span>
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-600">
                                    R.J. N° 016-2018-CENEPRED/J
                                </span>
                                <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-neutral-600">
                                    RNE A.010 / A.130 · CNE-U
                                </span>
                            </div>

                            {/* Código de informe y fecha */}
                            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 print:break-inside-avoid">
                                <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-50/70 px-3 py-1.5">
                                    <Stamp className="h-3.5 w-3.5 text-emerald-900" />
                                    <span className="text-[10px] font-bold text-emerald-950 uppercase">N° de Informe:</span>
                                    <span className="font-mono text-xs font-black text-emerald-950">{codigoInforme}</span>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5">
                                    <CalendarClock className="h-3.5 w-3.5 text-neutral-500" />
                                    <span className="text-[10px] font-bold text-neutral-600 uppercase">Fecha:</span>
                                    <span className="font-mono text-[11px] font-bold text-neutral-800">{fechaEmision}</span>
                                </div>
                            </div>

                            {/* Descargo legal de no-oficialidad */}
                            <div className="mt-4 rounded-xl border border-neutral-300 bg-neutral-100 p-3 text-left print:break-inside-avoid">
                                <p className="text-[10px] leading-relaxed text-neutral-700">
                                    <strong>Aviso legal:</strong> Este documento es de carácter informativo, educativo y preventivo. Ha sido
                                    generado a partir de las declaraciones del ciudadano y no constituye certificación, aprobación municipal ni
                                    autorización de funcionamiento.
                                </p>
                            </div>
                        </header>

                        {/* 2. Datos generales declarados del establecimiento */}
                        <section className="print:break-inside-avoid">
                            <div className="mb-2.5 flex items-center gap-2">
                                <FileCheck className="h-4 w-4 text-emerald-900" />
                                <h2 className="text-xs font-black tracking-wider text-neutral-800 uppercase">
                                    Datos Generales Declarados del Establecimiento
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                                {datosGenerales.map((item) => (
                                    <div key={item.label} className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-900" />
                                            <span className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase">{item.label}</span>
                                        </div>
                                        <p className="text-xs leading-snug font-bold break-words text-neutral-900">{item.value}</p>
                                        <p className="mt-0.5 text-[9px] text-neutral-400">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. Resumen de diagnóstico */}
                        <section className="print:break-inside-avoid">
                            <div className="mb-2.5 flex items-center gap-2">
                                <Gauge className="h-4 w-4 text-emerald-900" />
                                <h2 className="text-xs font-black tracking-wider text-neutral-800 uppercase">
                                    Resumen de Diagnóstico Preventivo
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-emerald-100">
                                        <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                                        <div>
                                            <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                                Semáforo Preventivo
                                            </span>
                                            <span className="text-sm font-black text-emerald-900">{autoevaluacion.semaforo}</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 border border-emerald-100">
                                        <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                            GAP Final de Preparación
                                        </span>
                                        <span className="text-sm font-black text-emerald-900">{gapFinal}</span>
                                    </div>
                                    <div className="rounded-xl bg-white p-3 border border-emerald-100">
                                        <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                            Ciclo Subsanado
                                        </span>
                                        <span className="text-sm font-black text-emerald-900">{resumen.porcentaje_subsanado}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2.5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
                                {metricas.map((item) => (
                                    <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-3">
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-900" />
                                            <span className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase">{item.label}</span>
                                        </div>
                                        <p className="text-sm leading-snug font-black text-neutral-900">{item.value}</p>
                                        <p className="mt-0.5 text-[9px] text-neutral-400">{item.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. Matriz de trazabilidad de subsanaciones */}
                        <section className="print:break-inside-avoid">
                            <div className="mb-2.5 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-emerald-900" />
                                <h2 className="text-xs font-black tracking-wider text-neutral-800 uppercase">
                                    Matriz de Trazabilidad de Subsanaciones
                                </h2>
                            </div>

                            {matrizSubsanaciones.length === 0 ? (
                                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                                    <span className="text-[11px] text-neutral-500">
                                        Sin adecuaciones declaradas que consignar en esta autoevaluación.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {matrizSubsanaciones.map((fila) => (
                                        <div
                                            key={fila.codigo_item}
                                            className="rounded-2xl border border-neutral-200 overflow-hidden print:break-inside-avoid"
                                        >
                                            <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2">
                                                <span className="font-mono text-xs font-black text-[#7f1d1d]">{fila.codigo_item}</span>
                                                <span className="text-[10px] text-neutral-400">
                                                    {fila.estado} · {fila.fecha_subsanacion ?? 'Sin fecha'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_1.4fr_1fr] print:grid-cols-[1fr_1.4fr_1fr]">
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                                        Deficiencia Inicial
                                                    </span>
                                                    <p className="mt-0.5 text-[11px] leading-snug font-semibold text-neutral-800">
                                                        {fila.deficiencia_inicial}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                                        Acción Realizada
                                                    </span>
                                                    <p className="mt-0.5 text-[11px] leading-snug text-neutral-700">{fila.accion_realizada}</p>
                                                </div>
                                                <div>
                                                    <span className="block text-[9px] font-bold tracking-wider text-neutral-500 uppercase">
                                                        Evidencia Adjunta
                                                    </span>
                                                    {fila.evidencia_url ? (
                                                        esImagenEvidencia(fila.evidencia_url) ? (
                                                            <a
                                                                href={fila.evidencia_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-1 block"
                                                            >
                                                                <img
                                                                    src={fila.evidencia_url}
                                                                    alt={`Evidencia de ${fila.codigo_item}`}
                                                                    className="max-h-20 w-full rounded-md border border-neutral-200 object-contain break-inside-avoid"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <a
                                                                href={fila.evidencia_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-800 hover:underline break-inside-avoid"
                                                            >
                                                                <FileText className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">Ver documento</span>
                                                            </a>
                                                        )
                                                    ) : (
                                                        <span className="mt-1 block text-[10px] text-neutral-400">Sin evidencia declarada</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Cuerpo del informe */}
                        <div className="space-y-3 text-justify text-xs leading-relaxed text-neutral-700 sm:text-sm print:space-y-2">
                            <p>
                                El titular del establecimiento <strong>"{autoevaluacion.nombre_comercio}"</strong>, identificado con{' '}
                                <strong>RUC N° {autoevaluacion.ruc}</strong>, ubicado en el sector territorial{' '}
                                <strong>{autoevaluacion.sector_huancayo}</strong> de la provincia de Huancayo, con un área techada de{' '}
                                <strong>{autoevaluacion.area_m2} m²</strong>, <strong>{autoevaluacion.pisos} piso(s)</strong> y aforo estimado
                                para <strong>{autoevaluacion.aforo} personas</strong>, ha completado voluntariamente el ciclo de autoevaluación
                                preventiva: revisión de condiciones técnicas, simulación de revisión in situ y plan de adecuaciones declaradas,
                                con un GAP final de preparación del <strong>{gapFinal}</strong>.
                            </p>
                            <p>
                                Las condiciones técnicas fueron revisadas por el propio titular usando como referencia la{' '}
                                <strong>R.J. N° 016-2018-CENEPRED</strong>, el <strong>D.S. N° 002-2018-PCM</strong>, el Reglamento Nacional de
                                Edificaciones (Normas <strong>A.010</strong> y <strong>A.130</strong>) y el Código Nacional de Electricidad (
                                <strong>CNE-U</strong>). Por tratarse de una declaración personal, este informe <strong>no garantiza ni anticipa</strong>{' '}
                                el resultado de la inspección oficial, cuya evaluación corresponde a la autoridad municipal competente.
                            </p>
                        </div>

                        {/* Declaración del titular */}
                        <div className="flex items-end justify-center pt-6 text-center print:break-inside-avoid print:pt-4">
                            <div className="w-56 border-t border-neutral-400 pt-2">
                                <span className="block text-[10px] font-bold text-neutral-700 uppercase">Firma del Titular / Declarante</span>
                                <span className="text-[9px] text-neutral-400">Declaración voluntaria de autoevaluación</span>
                            </div>
                        </div>

                        {/* 5. Pie de página pericial preventivo: QR + huella criptográfica */}
                        <section className="rounded-2xl border border-neutral-200 p-4 print:break-inside-avoid">
                            <div className="mb-3 flex items-center gap-2">
                                <Hash className="h-4 w-4 text-emerald-900" />
                                <h2 className="text-xs font-black tracking-wider text-neutral-800 uppercase">
                                    Trazabilidad Pericial Preventiva
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2 text-[11px] text-neutral-600">
                                    <div className="flex items-start gap-2">
                                        <Stamp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                        <div>
                                            <span className="block text-[9px] font-bold tracking-wider text-neutral-700 uppercase">
                                                UUID de Trazabilidad
                                            </span>
                                            <span className="font-mono break-all text-neutral-900 select-all">
                                                {autoevaluacion.uuid_trazabilidad}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                                        <div>
                                            <span className="block text-[9px] font-bold tracking-wider text-neutral-700 uppercase">
                                                Fecha de Generación
                                            </span>
                                            <span className="font-mono text-neutral-900">{fechaEmision}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                                        <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-800" />
                                        <div>
                                            <span className="block text-[9px] font-bold tracking-wider text-emerald-900 uppercase">
                                                Estado del Ciclo
                                            </span>
                                            <span className="text-xs font-black text-emerald-900">PREPARACIÓN DECLARADA COMPLETA</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                                    <div className="shrink-0 rounded-lg border border-neutral-200 bg-white p-1.5">
                                        <QRCodeSVG value={urlSeguimiento} size={84} level="M" />
                                    </div>
                                    <div className="space-y-1 text-[10px] text-neutral-500">
                                        <span className="flex items-center gap-1 font-bold text-neutral-800">
                                            <QrCode className="h-3 w-3" /> Seguimiento Preventivo
                                        </span>
                                        <p className="leading-tight">
                                            Escanea para verificar la trazabilidad del registro, revisar tu plan y mantener al día tus condiciones.
                                        </p>
                                        <a
                                            href={urlSeguimiento}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 pt-1 font-bold text-[#7f1d1d] hover:underline"
                                        >
                                            <span>Abrir seguimiento</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 space-y-2">
                                <div className="rounded-xl bg-neutral-900 p-3 font-mono text-neutral-300 print:bg-neutral-900">
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-[10px] tracking-wider text-neutral-400 uppercase">
                                            Hash SHA-256 del Registro
                                        </span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed break-all select-all">{hashIntegridad}</p>
                                </div>
                                <div className="rounded-xl bg-neutral-900 p-3 font-mono text-neutral-300 print:bg-neutral-900">
                                    <div className="mb-1 flex items-center gap-1.5">
                                        <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-[10px] tracking-wider text-neutral-400 uppercase">
                                            Huella Criptográfica del Payload Consolidado
                                        </span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed break-all select-all">{hashFinal}</p>
                                </div>
                            </div>
                        </section>

                        {/* Pie de la hoja */}
                        <div className="flex items-start gap-2 border-t border-neutral-200 pt-3 text-center">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400" />
                            <p className="text-[9px] text-neutral-500">
                                Informe cívico de autoevaluación generado por el asistente CheckITSE Huancayo. Su verificación queda respaldada
                                por el bloque de trazabilidad criptográfica. Este documento es de carácter preventivo e informativo y no
                                constituye un documento oficial.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pie de página web — oculto al imprimir */}
                <footer className="mt-6 text-center text-[11px] text-neutral-400 print:hidden">
                    CheckITSE Huancayo · Plataforma Cívica de Autoevaluación y Preparación ITSE
                </footer>
            </main>
        </div>
    );
}