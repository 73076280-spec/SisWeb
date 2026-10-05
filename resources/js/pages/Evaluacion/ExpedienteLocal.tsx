import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import { DesgloseEspecialidades } from '@/components/Evaluacion/DesgloseEspecialidades';
import { HojaModeloAnexo } from '@/components/Evaluacion/HojaModeloAnexo';
import { DiagnosticoMultidimensional } from '@/components/Evaluacion/DiagnosticoMultidimensional';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Files,
  FolderCheck,
  Hash,
  Info,
  MoveHorizontal,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AutoevaluacionItem,
  ExpedienteLocalProps,
} from '@/types/contrato';

interface SegmentoEstado {
  clave: string;
  etiqueta: string;
  valor: number;
  barra: string;
  color: string;
  chip: string;
}

const configSemaforo: Record<string, { label: string; corto: string; dot: string; badge: string; text: string; icon: typeof CheckCircle2 }> = {
  VERDE: {
    label: 'VERDE — Favorable Preventivo',
    corto: 'Favorable',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'text-emerald-800',
    icon: CheckCircle2,
  },
  AMBAR: {
    label: 'ÁMBAR — Aspectos por revisar',
    corto: 'Por revisar',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    text: 'text-amber-900',
    icon: AlertTriangle,
  },
  ROJO: {
    label: 'ROJO — Atención prioritaria',
    corto: 'Atención prioritaria',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'text-rose-800',
    icon: ShieldAlert,
  },
};

const configPorDefecto = {
  label: 'Autoevaluado',
  corto: 'Autoevaluado',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-700 border-slate-200',
  text: 'text-slate-700',
  icon: ShieldCheck,
};

function segmentosEstado(item: AutoevaluacionItem, esFlujoNuevo: boolean): SegmentoEstado[] {
  if (esFlujoNuevo && item.conteos_normativos) {
    const c = item.conteos_normativos;
    return [
      { clave: 'cumple', etiqueta: 'Cumple', valor: c.cumple_declarado, barra: 'bg-emerald-600', color: '#059669', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
      { clave: 'pendiente', etiqueta: 'No cumple', valor: c.pendiente_atender, barra: 'bg-rose-500', color: '#f43f5e', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
      { clave: 'revisar', etiqueta: 'Por revisar', valor: c.por_revisar, barra: 'bg-amber-500', color: '#f59e0b', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
      { clave: 'na', etiqueta: 'No aplica', valor: c.no_aplica, barra: 'bg-slate-300', color: '#cbd5e1', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
    ];
  }

  const c = item.conteo_condiciones;
  return [
    { clave: 'cumple', etiqueta: 'Cumple', valor: c?.cumple ?? 0, barra: 'bg-emerald-600', color: '#059669', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { clave: 'pendiente', etiqueta: 'No cumple', valor: c?.no_cumple ?? 0, barra: 'bg-rose-500', color: '#f43f5e', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
    { clave: 'revisar', etiqueta: 'Por revisar', valor: c?.por_revisar ?? 0, barra: 'bg-amber-500', color: '#f59e0b', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
    { clave: 'na', etiqueta: 'No aplica', valor: c?.na ?? 0, barra: 'bg-slate-300', color: '#cbd5e1', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
  ];
}

function pendientesDetectados(item: AutoevaluacionItem, esFlujoNuevo: boolean): number {
  if (esFlujoNuevo) {
    return (item.conteos_normativos?.pendiente_atender ?? 0) + (item.conteos_normativos?.por_revisar ?? 0);
  }
  return (item.conteo_condiciones?.no_cumple ?? 0) + (item.conteo_condiciones?.por_revisar ?? 0);
}

function formatVariacion(val: number, sufijo: string = ''): string {
  if (val > 0) return `+${val}${sufijo}`;
  if (val < 0) return `${val}${sufijo}`;
  return `0${sufijo}`;
}

function porcentajeCumplimientoSeguro(cumplidas: number, pendientes: number, porRevisar: number): number {
  const totalEvaluables = cumplidas + pendientes + porRevisar;
  if (totalEvaluables <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((cumplidas / totalEvaluables) * 100)));
}

export default function ExpedienteLocal({ proceso }: ExpedienteLocalProps) {
  const [evaluacionAReevaluar, setEvaluacionAReevaluar] = useState<{ uuid: string; nombre: string } | null>(null);
  const [modalHojaModeloAbierto, setModalHojaModeloAbierto] = useState<boolean>(false);

  const { original, reevaluaciones: reevs, tieneReevaluaciones: tieneReev } = proceso;
  const esFlujoNuevo = Boolean(original.es_flujo_nuevo);
  const cfgOriginal = configSemaforo[String(original.semaforo)] ?? configPorDefecto;
  const IconOriginal = cfgOriginal.icon;
  const subsanacionesOrig = original.resumen_subsanaciones;
  const enCurso = original.estado === 'INICIADA';
  const pendientes = pendientesDetectados(original, esFlujoNuevo);

  const segmentos = segmentosEstado(original, esFlujoNuevo);
  const totalSegmentos = segmentos.reduce((acc, s) => acc + s.valor, 0);
  const preparacion = porcentajeCumplimientoSeguro(
    segmentos.find(s => s.clave === 'cumple')?.valor ?? 0,
    segmentos.find(s => s.clave === 'pendiente')?.valor ?? 0,
    segmentos.find(s => s.clave === 'revisar')?.valor ?? 0,
  );

  const filasHistorial = [
    { item: original, etiqueta: 'Original' },
    ...reevs.map((r, idx) => ({ item: r, etiqueta: `Reevaluación #${idx + 1}` })),
  ];

  const ultimaUuidExpediente = proceso.ultimaEvaluacion.uuid_trazabilidad;
  const clasificacionTramite = proceso.ultimaEvaluacion?.clasificacion_tramite ?? original.clasificacion_tramite;
  const esModalidadExAnte = clasificacionTramite
    ? clasificacionTramite.tipo_tramite === 'EX_ANTE'
    : (cfgOriginal.label.includes('ROJO') || pendientes > 0);

  return (
    <>
      <Head title={`Expediente: ${proceso.nombre_comercio} - CheckITSE Huancayo`} />

      <ModalConfirmarReevaluacion
        isOpen={Boolean(evaluacionAReevaluar)}
        onClose={() => setEvaluacionAReevaluar(null)}
        uuid={evaluacionAReevaluar?.uuid ?? ''}
        nombreComercio={evaluacionAReevaluar?.nombre}
      />

      <div className="min-h-screen bg-slate-50/70 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Barra superior de navegación / breadcrumb */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
            <Link
              href={route('mis-autoevaluaciones')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 w-fit"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" />
              <span>Volver a Mis Autoevaluaciones</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-600">
                <Store className="h-3.5 w-3.5 text-slate-400" />
                Local #{proceso.id}
              </span>
              {original.codigo_acceso && (
                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-bold text-slate-900 shadow-2xs select-all">
                  {original.codigo_acceso}
                </span>
              )}
            </div>
          </div>

          {/* Encabezado del Local */}
          <header className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Expediente Técnico del Establecimiento
                  </span>
                  <span className="text-xs text-slate-400">
                    {esFlujoNuevo ? 'Normativa Vigente CENEPRED' : 'Histórico Transicional'}
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {proceso.nombre_comercio}
                </h1>
                <p className="text-sm text-slate-600">
                  {proceso.funcion_economica}
                  {proceso.ruc ? ` · RUC ${proceso.ruc}` : ''}
                  {proceso.direccion ? ` · ${proceso.direccion}` : ' · Huancayo'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {enCurso ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    INICIADA
                  </span>
                ) : esFlujoNuevo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    REGISTRADA
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-bold ${cfgOriginal.badge}`}>
                    <IconOriginal className="h-3.5 w-3.5" />
                    {cfgOriginal.label}
                  </span>
                )}
              </div>
            </div>

            {/* Metadatos adicionales */}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Fecha inicial: {original.fecha}
              </span>
              <span className="font-mono text-[11px] text-slate-500 select-all">
                UUID: {original.uuid_trazabilidad}
              </span>
              {original.registrada_at && (
                <span className="text-slate-600">
                  Registrada: <strong className="font-semibold text-slate-800">{original.registrada_at}</strong>
                </span>
              )}
            </div>
          </header>

          {/* A. ESTADO TÉCNICO DE SEGURIDAD Y DESGLOSES */}
          <section
            aria-label={`Estado técnico de seguridad de ${proceso.nombre_comercio}`}
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Estado Técnico de Seguridad
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Condiciones declaradas y desglose cuantitativo por disciplina
                </p>
              </div>

              <span className="text-xl font-black text-slate-900">
                {preparacion}% <span className="text-xs font-bold text-slate-500">preparación</span>
              </span>
            </div>

            {/* Barra de progreso */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Avance preventivo declarado
                </span>
                <span className="font-black text-slate-900">{preparacion}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    original.semaforo === 'VERDE'
                      ? 'bg-emerald-600'
                      : original.semaforo === 'ROJO'
                        ? 'bg-rose-600'
                        : 'bg-amber-500'
                  }`}
                  style={{ width: `${preparacion}%` }}
                />
              </div>
            </div>

            {/* Desglose por estado de las condiciones */}
            <div>
              {totalSegmentos > 0 ? (
                <div aria-hidden="true" className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  {segmentos
                    .filter(s => s.valor > 0)
                    .map(s => (
                      <div key={s.clave} className={s.barra} style={{ width: `${(s.valor / totalSegmentos) * 100}%` }} />
                    ))}
                </div>
              ) : (
                <div aria-hidden="true" className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" />
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {segmentos.map(s => (
                  <div key={s.clave} className={`rounded-2xl border p-3 text-center ${s.chip}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider">{s.etiqueta}</span>
                    <span className="mt-0.5 block text-lg font-black">{s.valor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose por especialidad (flujo nuevo) */}
            {original.desglose_especialidades && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-700">
                  Desglose por Especialidad Técnica
                </h3>
                <DesgloseEspecialidades desglose={original.desglose_especialidades} variante="compacta" />
              </div>
            )}

            {/* Estado de subsanaciones */}
            {subsanacionesOrig && subsanacionesOrig.total > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold border-t border-slate-100 pt-3">
                <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
                  {subsanacionesOrig.subsanadas} Subsanadas
                </span>
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">
                  {subsanacionesOrig.en_proceso} En Proceso
                </span>
                <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-800">
                  {subsanacionesOrig.pendientes} Pendientes
                </span>
              </div>
            )}

            {/* Acciones principales del local */}
            <div className="flex flex-wrap items-center justify-start gap-2.5 border-t border-slate-100 pt-4">
              {enCurso ? (
                <Link
                  href={route('autoevaluacion.checklist', { uuid: original.uuid_trazabilidad })}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                >
                  <span>Continuar Checklist</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEvaluacionAReevaluar({ uuid: original.uuid_trazabilidad, nombre: original.nombre_comercio })}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    <span>Reevaluar Establecimiento</span>
                  </button>
                  <Link
                    href={route('autoevaluacion.informe', { uuid: original.uuid_trazabilidad })}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                  >
                    <FileText className="h-4 w-4 text-slate-500" />
                    <span>Ver Informe Preventivo</span>
                  </Link>
                  {pendientes > 0 ? (
                    <>
                      <Link
                        href={route('autoevaluacion.resultado', { uuid: original.uuid_trazabilidad })}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        <span>Revisar Alertas Pendientes ({pendientes})</span>
                      </Link>
                      <Link
                        href={route('directorio.index')}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                      >
                        <Store className="h-4 w-4 text-slate-500" />
                        <span>Directorio Cívico</span>
                      </Link>
                    </>
                  ) : (
                    <Link
                      href={route('autoevaluacion.resumen', { uuid: original.uuid_trazabilidad })}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Resumen Preventivo</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </section>

          {/* DIAGNÓSTICO ANALÍTICO MULTIDIMENSIONAL (CENEPRED Anexo 17) */}
          <DiagnosticoMultidimensional
            desglose={proceso.ultimaEvaluacion?.desglose_especialidades ?? original.desglose_especialidades}
            clasificacion={{
              tipo_tramite: clasificacionTramite?.tipo_tramite ?? (esModalidadExAnte ? 'EX_ANTE' : 'EX_POST'),
              nivel_riesgo: clasificacionTramite?.nivel_riesgo ?? (esModalidadExAnte ? 'ALTO' : 'MEDIO'),
              es_previa: esModalidadExAnte,
            }}
            nombreComercio={proceso.nombre_comercio}
          />

          {/* EXPEDIENTE DIGITAL PREVENTIVO: FORMATOS OFICIALES IMPRIMIBLES */}
          <section
            aria-label="Formatos oficiales e imprimibles del expediente"
            className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-slate-800 p-2.5 text-white">
                  <FolderCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Formatos Oficiales Imprimibles (D.S. N° 002-2018-PCM)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Documentos canónicos prellenados para presentación física en mesa de partes de la Municipalidad Provincial de Huancayo.
                  </p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                esModalidadExAnte
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900'
              }`}>
                {esModalidadExAnte ? 'Modalidad: ITSE Previa (Ex-Ante)' : 'Modalidad: ITSE Posterior (Ex-Post)'}
              </span>
            </div>

            {!esModalidadExAnte ? (
              /* MODALIDAD ITSE POSTERIOR (EX-POST) */
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/90 to-teal-50/50 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      Requisito Principal Mesa de Partes
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800">
                      Anexo 4 Oficial
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-emerald-950">
                      Declaración Jurada de Cumplimiento ITSE (Anexo 4)
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed mt-1 max-w-3xl">
                      Formato oficial exigido por la Municipalidad Provincial de Huancayo para el otorgamiento de Licencia de Funcionamiento con inspección técnica posterior (Riesgo Bajo o Medio).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={route('autoevaluacion.anexo', { uuid: ultimaUuidExpediente, numero: 4 })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Descargar / Imprimir Declaración Jurada (Anexo 4)</span>
                    </a>

                    <a
                      href={route('autoevaluacion.anexo', { uuid: ultimaUuidExpediente, numero: 9 })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                    >
                      <ClipboardList className="h-4 w-4 text-slate-500" />
                      <span>Solicitud ITSE (Anexo 9 — Opcional)</span>
                    </a>

                    <Link
                      href={route('autoevaluacion.informe', { uuid: ultimaUuidExpediente })}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                    >
                      <Printer className="h-4 w-4 text-slate-500" />
                      <span>Informe Preventivo Imprimible</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setModalHojaModeloAbierto(true)}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-2xs transition hover:bg-emerald-50 active:scale-95"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Guía de Llenado Asistido (Hoja Modelo)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* MODALIDAD ITSE PREVIA (EX-ANTE) */
              <div className="space-y-4">
                {/* Alerta de bloqueo normativo de Anexo 4 */}
                <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                    <span>No aplica Declaración Jurada (Anexo 4)</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Por normativa nacional (D.S. N° 002-2018-PCM), los establecimientos calificados como <strong>Riesgo Alto o Muy Alto</strong> no pueden acogerse a inspección posterior ni presentar Declaración Jurada (Anexo 4). Es obligatorio tramitar la <strong>Inspección Técnica Previa</strong> con un grupo inspector multidisciplinario antes del otorgamiento de la Licencia.
                  </p>
                </div>

                {/* Solicitud de ITSE Previa destacada */}
                <div className="rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-50/90 to-blue-50/50 p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-sky-900 bg-sky-200/80 px-2.5 py-0.5 rounded-full">
                      <FileCheck className="w-3.5 h-3.5 text-sky-700" />
                      Requisito Principal Mesa de Partes
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-800">
                      Anexo 9 Oficial
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-sky-950">
                      Solicitud de ITSE Previa (Anexo 9)
                    </h3>
                    <p className="text-xs text-sky-900 leading-relaxed mt-1 max-w-3xl">
                      Formato oficial para la programación de la inspección técnica de seguridad multidisciplinaria in situ por inspectores CENEPRED.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <a
                      href={route('autoevaluacion.anexo', { uuid: ultimaUuidExpediente, numero: 9 })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-sky-700 active:scale-95"
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>Descargar Solicitud de ITSE Previa (Anexo 9)</span>
                    </a>

                    <Link
                      href={route('autoevaluacion.informe', { uuid: ultimaUuidExpediente })}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                    >
                      <Printer className="h-4 w-4 text-slate-500" />
                      <span>Informe Preventivo Imprimible</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setModalHojaModeloAbierto(true)}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white px-4 py-2.5 text-xs font-bold text-sky-950 shadow-2xs transition hover:bg-sky-50 active:scale-95"
                    >
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      <span>Guía de Llenado Asistido (Hoja Modelo)</span>
                    </button>
                  </div>
                </div>

                {/* Tarjeta de Checklist de Requisitos del Expediente Técnico */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Files className="h-4 w-4 text-slate-600" />
                      Expediente Técnico Requerido para Mesa de Partes (ITSE Previa)
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">D.S. 002-2018-PCM</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Para admitir a trámite su solicitud de ITSE Previa en la Municipalidad Provincial de Huancayo, debe adjuntar el siguiente expediente técnico con firmas de profesionales colegiados habilitados:
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2 pt-1 text-xs">
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">1</span>
                      <span className="leading-snug text-slate-700">
                        <strong>Planos de arquitectura (Escala 1/100 o 1/50):</strong> Distribución arquitectónica y memoria descriptiva con cálculo de aforo firmado por <strong>Arquitecto colegiado y habilitado (CAP)</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">2</span>
                      <span className="leading-snug text-slate-700">
                        <strong>Planos eléctricos y unifilares:</strong> Diagramas unifilares y cuadro de cargas firmado por <strong>Ing. Electricista o Mecánico-Electricista colegiado y habilitado (CIP)</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">3</span>
                      <span className="leading-snug text-slate-700">
                        <strong>Protocolo de puesta a tierra (≤ 25 Ω):</strong> Certificado de medición vigente firmado por <strong>Ing. Electricista/Mecánico-Electricista colegiado (CIP)</strong> con constancia de telurómetro.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">4</span>
                      <span className="leading-snug text-slate-700">
                        <strong>Plan de Seguridad en Defensa Civil:</strong> Foliado y firmado en todas sus páginas por el administrado y profesional competente, incluyendo planos de evacuación y señalización.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:col-span-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">5</span>
                      <span className="leading-snug text-slate-700">
                        <strong>Certificados técnicos de operatividad:</strong> Constancias vigentes de extintores (PQS o Clase K en caso de cocina comercial) y pruebas de hermeticidad de GLP si corresponde.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="flex items-start gap-2 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                Los documentos se generan con los datos declarados por el administrado y su código de trazabilidad único. Recuerde adjuntar los requisitos administrativos solicitados por Mesa de Partes.
              </span>
            </p>
          </section>

          {/* B. EVOLUCIÓN DECLARADA (SI TIENE REEVALUACIONES) */}
          {tieneReev && (
            <section
              aria-label={`Evolución declarada de ${proceso.nombre_comercio}`}
              className="rounded-3xl border border-sky-200/80 bg-sky-50/40 p-6 shadow-xs sm:p-7 space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-sky-600 p-2 text-white">
                  <Scale className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-black tracking-wider text-sky-950 uppercase">
                    Evolución Declarada del Establecimiento
                  </h2>
                  <p className="text-xs text-sky-800">
                    Variación cuantitativa de respuestas declaradas entre la evaluación original y la última reevaluación registrada.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-sky-200 bg-white p-3 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Variación de Preparación
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-base font-black ${
                      proceso.difPorcentaje > 0
                        ? 'text-emerald-600'
                        : proceso.difPorcentaje < 0
                          ? 'text-rose-600'
                          : 'text-slate-700'
                    }`}
                  >
                    {proceso.difPorcentaje > 0 && <TrendingUp className="h-4 w-4" />}
                    {proceso.difPorcentaje < 0 && <TrendingDown className="h-4 w-4" />}
                    {formatVariacion(proceso.difPorcentaje, '%')}
                  </span>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-white p-3 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Variación No Cumple
                  </span>
                  <span
                    className={`text-base font-black ${
                      proceso.difNoCumple < 0 ? 'text-emerald-600' : proceso.difNoCumple > 0 ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    {formatVariacion(proceso.difNoCumple)}
                  </span>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-white p-3 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Variación Por Revisar
                  </span>
                  <span className={`text-base font-black ${proceso.difPorRevisar < 0 ? 'text-sky-600' : 'text-slate-700'}`}>
                    {formatVariacion(proceso.difPorRevisar)}
                  </span>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-white p-3 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Variación Cumple
                  </span>
                  <span className={`text-base font-black ${proceso.difCumple > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {formatVariacion(proceso.difCumple)}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-sky-100 bg-sky-50/70 text-[10px] font-bold uppercase tracking-wider text-sky-950">
                      <tr>
                        <th scope="col" className="px-4 py-2.5">Indicador Técnico Declarado</th>
                        <th scope="col" className="px-4 py-2.5 text-center">
                          Original ({original.fecha_corta ?? original.fecha})
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-center">
                          Última ({proceso.ultimaEvaluacion.fecha_corta ?? proceso.ultimaEvaluacion.fecha})
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-center">Variación Numérica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      <tr>
                        <td className="px-4 py-2.5">Condiciones Cumple</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{original.conteo_condiciones?.cumple ?? '-'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                          {proceso.ultimaEvaluacion.conteo_condiciones?.cumple ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{formatVariacion(proceso.difCumple)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5">Incumplimientos Declarados (No Cumple)</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{original.conteo_condiciones?.no_cumple ?? '-'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                          {proceso.ultimaEvaluacion.conteo_condiciones?.no_cumple ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-rose-600">{formatVariacion(proceso.difNoCumple)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5">Condiciones Por Revisar</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{original.conteo_condiciones?.por_revisar ?? '-'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                          {proceso.ultimaEvaluacion.conteo_condiciones?.por_revisar ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-600">{formatVariacion(proceso.difPorRevisar)}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5">Condiciones No Aplica (NA)</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">{original.conteo_condiciones?.na ?? '-'}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-900">
                          {proceso.ultimaEvaluacion.conteo_condiciones?.na ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-600">{formatVariacion(proceso.difNa)}</td>
                      </tr>
                      <tr className="bg-sky-50/40 font-bold">
                        <td className="px-4 py-2.5 text-slate-900">Preparación Declarada</td>
                        <td className="px-4 py-2.5 text-center text-slate-900">{original.porcentaje_cumplimiento}%</td>
                        <td className="px-4 py-2.5 text-center text-slate-900">
                          {proceso.ultimaEvaluacion.porcentaje_cumplimiento}%
                        </td>
                        <td className="px-4 py-2.5 text-center text-sky-900">{formatVariacion(proceso.difPorcentaje, '%')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* C. HISTORIAL DE AUTOEVALUACIONES PREVENTIVAS */}
          <section
            aria-label={`Historial preventivo de ${proceso.nombre_comercio}`}
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
              <div>
                <h2 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                  Historial de Registros Preventivos
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Todas las versiones y reevaluaciones registradas para este establecimiento
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                {filasHistorial.length} registro{filasHistorial.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Registro</th>
                    <th scope="col" className="px-4 py-3">Fecha</th>
                    <th scope="col" className="px-4 py-3">Estado</th>
                    <th scope="col" className="hidden px-4 py-3 sm:table-cell">Semáforo</th>
                    <th scope="col" className="px-4 py-3 text-center">Preparación</th>
                    <th scope="col" className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasHistorial.map(({ item, etiqueta }) => {
                    const cfg = configSemaforo[String(item.semaforo)] ?? configPorDefecto;
                    const IconoSemaforo = cfg.icon;
                    const iniciado = item.estado === 'INICIADA';

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3.5">
                          <span className={`block font-bold ${etiqueta === 'Original' ? 'text-slate-900' : 'text-slate-700'}`}>
                            {etiqueta}
                          </span>
                          {item.codigo_acceso && (
                            <span className="mt-0.5 block font-mono text-[10px] text-slate-500 select-all">
                              {item.codigo_acceso}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">
                          <span className="block">{item.fecha_corta ?? item.fecha}</span>
                          {item.registrada_at && (
                            <span className="mt-0.5 block text-[10px] text-slate-400">Reg. {item.registrada_at}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {iniciado ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                              <Clock className="h-3 w-3 text-amber-600" />
                              INICIADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              REGISTRADA
                            </span>
                          )}
                          <span className={`mt-1.5 flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold sm:hidden ${cfg.badge}`}>
                            <IconoSemaforo className="h-3 w-3" />
                            {item.semaforo}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3.5 sm:table-cell">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                            <IconoSemaforo className="h-3 w-3" />
                            {item.semaforo}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-black text-slate-900">{item.porcentaje_cumplimiento}%</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {iniciado ? (
                              <Link
                                href={route('autoevaluacion.checklist', { uuid: item.uuid_trazabilidad })}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition hover:bg-emerald-700 active:scale-95"
                              >
                                <span>Continuar</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={route('autoevaluacion.resumen', { uuid: item.uuid_trazabilidad })}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                                >
                                  <Eye className="h-3 w-3 text-slate-500" />
                                  <span>Resumen</span>
                                </Link>
                                <Link
                                  href={route('autoevaluacion.informe', { uuid: item.uuid_trazabilidad })}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
                                >
                                  <FileText className="h-3 w-3 text-slate-500" />
                                  <span>Informe</span>
                                </Link>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] text-slate-500 sm:hidden">
              <MoveHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Desliza la tabla horizontalmente para ver todas las columnas.
            </p>
          </section>

        </div>
      </div>

      <HojaModeloAnexo
        isOpen={modalHojaModeloAbierto}
        onClose={() => setModalHojaModeloAbierto(false)}
        autoevaluacion={original}
        clasificacion={{
          tipo_tramite: clasificacionTramite?.tipo_tramite ?? (esModalidadExAnte ? 'EX_ANTE' : 'EX_POST'),
          nivel_riesgo: clasificacionTramite?.nivel_riesgo ?? (esModalidadExAnte ? 'ALTO' : 'MEDIO'),
          es_previa: esModalidadExAnte,
        }}
      />
    </>
  );
}
