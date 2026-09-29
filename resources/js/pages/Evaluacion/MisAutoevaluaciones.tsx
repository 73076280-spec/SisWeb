import { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  GitBranch,
  Hash,
  Info,
  PlusCircle,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  AutoevaluacionItem,
  MisAutoevaluacionesProps,
} from '@/types/contrato';

export interface ProcesoPreventivo {
  id: number;
  nombre_comercio: string;
  funcion_economica: string;
  ruc?: string | null;
  direccion?: string | null;
  original: AutoevaluacionItem;
  reevaluaciones: AutoevaluacionItem[];
  ultimaEvaluacion: AutoevaluacionItem;
  tieneReevaluaciones: boolean;
  difPorcentaje: number;
  difCumple: number;
  difNoCumple: number;
  difPorRevisar: number;
  difNa: number;
}

const configSemaforo: Record<string, { label: string; dot: string; badge: string; text: string; icon: typeof CheckCircle2 }> = {
  VERDE: {
    label: 'VERDE — Favorable Preventivo',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'text-emerald-800',
    icon: CheckCircle2,
  },
  AMBAR: {
    label: 'ÁMBAR — Aspectos por revisar',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    text: 'text-amber-900',
    icon: AlertTriangle,
  },
  ROJO: {
    label: 'ROJO — Atención prioritaria',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'text-rose-800',
    icon: ShieldAlert,
  },
};

const configPorDefecto = {
  label: 'Autoevaluado',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-700 border-slate-200',
  text: 'text-slate-700',
  icon: ShieldCheck,
};

interface SegmentoEstado {
  clave: string;
  etiqueta: string;
  valor: number;
  barra: string;
  chip: string;
}

/**
 * Desglose por estado de las condiciones declaradas. El flujo nuevo reporta
 * conteos normativos (`conteos_normativos`) y el legado reporte el conteo
 * plano de la matriz (`conteo_condiciones`); ambos describen los mismos cuatro
 * estados y ninguno se calcula aquí: solo se leen y se normaliza la etiqueta.
 */
function segmentosEstado(item: AutoevaluacionItem, esFlujoNuevo: boolean): SegmentoEstado[] {
  if (esFlujoNuevo) {
    const c = item.conteos_normativos;
    return [
      { clave: 'cumple', etiqueta: 'Cumple declarado', valor: c?.cumple_declarado ?? 0, barra: 'bg-emerald-600', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
      { clave: 'pendiente', etiqueta: 'Pendiente de atender', valor: c?.pendiente_atender ?? 0, barra: 'bg-rose-500', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
      { clave: 'revisar', etiqueta: 'Por revisar', valor: c?.por_revisar ?? 0, barra: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
      { clave: 'na', etiqueta: 'No aplica', valor: c?.no_aplica ?? 0, barra: 'bg-slate-300', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
    ];
  }

  const c = item.conteo_condiciones;
  return [
    { clave: 'cumple', etiqueta: 'Cumple', valor: c?.cumple ?? 0, barra: 'bg-emerald-600', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { clave: 'pendiente', etiqueta: 'No cumple', valor: c?.no_cumple ?? 0, barra: 'bg-rose-500', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
    { clave: 'revisar', etiqueta: 'Por revisar', valor: c?.por_revisar ?? 0, barra: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
    { clave: 'na', etiqueta: 'No aplica', valor: c?.na ?? 0, barra: 'bg-slate-300', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
  ];
}

/** Cantidad de condiciones que el ciudadano todavía debe atender. */
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

export default function MisAutoevaluaciones({ autoevaluaciones }: MisAutoevaluacionesProps) {
  const [evaluacionAReevaluar, setEvaluacionAReevaluar] = useState<{ uuid: string; nombre: string } | null>(null);

  // Agrupación estructurada de autoevaluaciones en Procesos Preventivos
  const procesos = useMemo<ProcesoPreventivo[]>(() => {
    if (!autoevaluaciones || autoevaluaciones.length === 0) {
      return [];
    }

    const originales = autoevaluaciones.filter((item) => !item.evaluacion_origen_id);
    const reevaluaciones = autoevaluaciones.filter((item) => Boolean(item.evaluacion_origen_id));

    // Mapear cada evaluación original con sus reevaluaciones asociadas
    const grupos: ProcesoPreventivo[] = originales.map((original) => {
      // Reevaluaciones de este origen común (orden cronológico ascendente: B (#1), C (#2), etc.)
      const reevsDelOrigen = reevaluaciones
        .filter((r) => r.evaluacion_origen_id === original.id)
        .sort((a, b) => a.id - b.id);

      const tieneReev = reevsDelOrigen.length > 0;
      const ultima = tieneReev ? reevsDelOrigen[reevsDelOrigen.length - 1] : original;

      const origConteo = original.conteo_condiciones || { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 };
      const ultConteo = ultima.conteo_condiciones || { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 };

      const difPorcentaje = Number((ultima.porcentaje_cumplimiento - original.porcentaje_cumplimiento).toFixed(1));
      const difCumple = ultConteo.cumple - origConteo.cumple;
      const difNoCumple = ultConteo.no_cumple - origConteo.no_cumple;
      const difPorRevisar = ultConteo.por_revisar - origConteo.por_revisar;
      const difNa = ultConteo.na - origConteo.na;

      return {
        id: original.id,
        nombre_comercio: original.nombre_comercio,
        funcion_economica: original.funcion_economica,
        ruc: original.ruc,
        direccion: original.direccion,
        original,
        reevaluaciones: reevsDelOrigen,
        ultimaEvaluacion: ultima,
        tieneReevaluaciones: tieneReev,
        difPorcentaje,
        difCumple,
        difNoCumple,
        difPorRevisar,
        difNa,
      };
    });

    // Casos borde: reevaluaciones huérfanas cuya evaluación original no figura en la cuenta
    const idsOriginales = new Set(originales.map((o) => o.id));
    const huerfanas = reevaluaciones.filter((r) => !idsOriginales.has(r.evaluacion_origen_id as number));

    const gruposHuerfanos: ProcesoPreventivo[] = huerfanas.map((huerfana) => ({
      id: huerfana.id,
      nombre_comercio: huerfana.nombre_comercio,
      funcion_economica: huerfana.funcion_economica,
      ruc: huerfana.ruc,
      direccion: huerfana.direccion,
      original: huerfana,
      reevaluaciones: [],
      ultimaEvaluacion: huerfana,
      tieneReevaluaciones: false,
      difPorcentaje: 0,
      difCumple: 0,
      difNoCumple: 0,
      difPorRevisar: 0,
      difNa: 0,
    }));

    return grupos.concat(gruposHuerfanos);
  }, [autoevaluaciones]);

  return (
    <>
      <Head title="Mis Autoevaluaciones - CheckITSE Huancayo" />
      <ModalConfirmarReevaluacion
        isOpen={Boolean(evaluacionAReevaluar)}
        onClose={() => setEvaluacionAReevaluar(null)}
        uuid={evaluacionAReevaluar?.uuid ?? ''}
        nombreComercio={evaluacionAReevaluar?.nombre}
      />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Cabecera del Panel */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Historial Preventivo Personal
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Mis Autoevaluaciones
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-600 sm:text-sm">
              Registro cronológico de tus autoevaluaciones y reevaluaciones preventivas. Consulta el estado de tus declaraciones, revisa las condiciones de tu local o inicia una nueva autoevaluación cuando lo requieras.
            </p>
          </div>

          <Link
            href="/autoevaluacion"
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:self-auto"
          >
            <PlusCircle className="h-4 w-4" />
            + Nueva Autoevaluación
          </Link>
        </header>

        {/* Disclaimer Legal Preventivo Permanente */}
        <aside
          role="note"
          aria-label="Aviso preventivo sobre el historial de autoevaluaciones"
          className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600 shadow-2xs"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p>
              <strong className="font-bold text-slate-800">Aviso preventivo:</strong> Las evaluaciones mostradas
              corresponden a declaraciones realizadas por el responsable del establecimiento. El historial permite
              comparar registros de autoevaluación, pero no constituye una verificación oficial de las condiciones de
              seguridad ni reemplaza la ITSE.
            </p>
          </div>
        </aside>

        {/* Listado de Procesos Preventivos */}
        {procesos.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">Aún no tienes autoevaluaciones guardadas</h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
              Cuando completes una autoevaluación preventiva y guardes tu progreso en esta cuenta, aparecerá aquí organizada
              por establecimiento junto con sus reevaluaciones posteriores.
            </p>
            <Link
              href="/autoevaluacion"
              className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Comenzar mi autoevaluación preventiva
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {procesos.map((proceso) => {
              const { original, reevaluaciones: reevs, tieneReevaluaciones: tieneReev } = proceso;
              const cfgOriginal = configSemaforo[original.semaforo] ?? configPorDefecto;
              const IconOriginal = cfgOriginal.icon;
              const subsanacionesOrig = original.resumen_subsanaciones;

              const esFlujoNuevo = Boolean(original.es_flujo_nuevo);
              const segmentos = segmentosEstado(original, esFlujoNuevo);
              const totalSegmentos = segmentos.reduce((acc, s) => acc + s.valor, 0);
              const pendientes = pendientesDetectados(original, esFlujoNuevo);
              const enCurso = original.estado === 'INICIADA';
              const preparacion = original.porcentaje_cumplimiento;

              const filasHistorial = [
                { item: original, etiqueta: 'Original' },
                ...reevs.map((r, idx) => ({ item: r, etiqueta: `Reevaluación #${idx + 1}` })),
              ];

              return (
                <section
                  key={proceso.id}
                  aria-labelledby={`proceso-titulo-${proceso.id}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs"
                >
                  {/* Cabecera del establecimiento */}
                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 text-emerald-600 shadow-2xs">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2
                            id={`proceso-titulo-${proceso.id}`}
                            className="text-base font-black text-slate-900 sm:text-lg"
                          >
                            {proceso.nombre_comercio}
                          </h2>
                          {proceso.ruc && (
                            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                              RUC {proceso.ruc}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Giro declarado: <strong className="font-semibold text-slate-700">{proceso.funcion_economica}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-2xs">
                        <GitBranch className="h-3.5 w-3.5 text-emerald-600" />
                        {tieneReev
                          ? `1 original + ${reevs.length} reevaluación${reevs.length > 1 ? 'es' : ''}`
                          : '1 autoevaluación registrada'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6 p-5 sm:p-6">
                    {/* A. Estado Técnico de Seguridad */}
                    <section aria-label={`Estado técnico de seguridad de ${proceso.nombre_comercio}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <ShieldCheck className="h-3 w-3 text-emerald-600" />
                            Estado Técnico de Seguridad
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {esFlujoNuevo ? 'Criterios normativos declarados' : 'Autoevaluación original'}
                          </span>
                        </div>

                        {enCurso ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            INICIADA
                          </span>
                        ) : esFlujoNuevo ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            REGISTRADA
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${cfgOriginal.badge}`}
                          >
                            <IconOriginal className="h-3.5 w-3.5" />
                            {cfgOriginal.label}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {original.codigo_acceso && (
                            <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-900 shadow-2xs select-all">
                              {original.codigo_acceso}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {original.fecha}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 select-all">
                            UUID: {original.uuid_trazabilidad}
                          </span>
                          {original.registrada_at && (
                            <span className="text-xs text-slate-500">
                              Registrada: <strong className="font-semibold text-slate-700">{original.registrada_at}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Avance preventivo declarado */}
                      {preparacion > 0 && (
                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Avance preventivo declarado
                            </span>
                            <span className="font-black text-slate-900">{preparacion}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                original.semaforo === 'VERDE'
                                  ? 'bg-emerald-600'
                                  : original.semaforo === 'ROJO'
                                    ? 'bg-rose-600'
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, preparacion))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Desglose por estado de las condiciones declaradas */}
                      <div className="mt-4">
                        {totalSegmentos > 0 ? (
                          <div
                            aria-hidden="true"
                            className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                          >
                            {segmentos
                              .filter((s) => s.valor > 0)
                              .map((s) => (
                                <div
                                  key={s.clave}
                                  className={s.barra}
                                  style={{ width: `${(s.valor / totalSegmentos) * 100}%` }}
                                />
                              ))}
                          </div>
                        ) : (
                          <div aria-hidden="true" className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" />
                        )}

                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {segmentos.map((s) => (
                            <div
                              key={s.clave}
                              className={`rounded-xl border p-2.5 text-center ${s.chip}`}
                            >
                              <span className="block text-[9px] font-bold uppercase tracking-wider">
                                {s.etiqueta}
                              </span>
                              <span className="mt-0.5 block text-base font-black">{s.valor}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Estado de subsanaciones si existen */}
                      {subsanacionesOrig && subsanacionesOrig.total > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800">
                            {subsanacionesOrig.subsanadas} Subsanadas
                          </span>
                          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">
                            {subsanacionesOrig.en_proceso} En Proceso
                          </span>
                          <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-800">
                            {subsanacionesOrig.pendientes} Pendientes
                          </span>
                        </div>
                      )}

                      {/* Presentación informativa de evaluación histórica (UX-06.2) */}
                      {!esFlujoNuevo && (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                          <Info className="h-4 w-4 shrink-0 text-amber-600" />
                          <span>
                            <strong>Evaluación histórica:</strong> Este registro pertenece a una versión anterior de la plataforma. Sus datos se conservan con fines de trazabilidad y consulta informativa.
                          </span>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                        {enCurso ? (
                          <Link
                            href={`/autoevaluacion/${original.uuid_trazabilidad}/checklist`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                          >
                            <span>Continuar Checklist</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setEvaluacionAReevaluar({
                                  uuid: original.uuid_trazabilidad,
                                  nombre: original.nombre_comercio,
                                })
                              }
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                            >
                              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                              <span>Reevaluar</span>
                            </button>
                            <Link
                              href={`/autoevaluacion/informe/${original.uuid_trazabilidad}`}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-500" />
                              <span>Ver Informe</span>
                            </Link>
                            {pendientes > 0 ? (
                              <Link
                                href={`/autoevaluacion/resultado/${original.uuid_trazabilidad}`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Revisar Alertas Pendientes ({pendientes})</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/autoevaluacion/${original.uuid_trazabilidad}/resumen`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Ver Resumen</span>
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </section>

                    {/* B. Resumen de Evolución Declarada y Comparación Objetiva (solo si hay reevaluaciones legacy) */}
                    {tieneReev && !esFlujoNuevo && (
                      <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="rounded-lg bg-sky-600 p-1.5 text-white">
                            <Scale className="h-4 w-4" />
                          </span>
                          <div>
                            <h3 className="text-xs font-black tracking-wider text-sky-950 uppercase sm:text-sm">
                              Evolución Declarada del Establecimiento
                            </h3>
                            <p className="text-[10px] text-sky-800">
                              Variación cuantitativa de respuestas declaradas entre la evaluación original y la última
                              reevaluación registrada.
                            </p>
                          </div>
                        </div>

                        {/* Tarjetas de variación */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Variación de Preparación
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-sm font-black ${
                                proceso.difPorcentaje > 0
                                  ? 'text-emerald-600'
                                  : proceso.difPorcentaje < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-700'
                              }`}
                            >
                              {proceso.difPorcentaje > 0 && <TrendingUp className="h-3.5 w-3.5" />}
                              {proceso.difPorcentaje < 0 && <TrendingDown className="h-3.5 w-3.5" />}
                              {formatVariacion(proceso.difPorcentaje, '%')}
                            </span>
                          </div>

                          <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Variación No Cumple
                            </span>
                            <span
                              className={`text-sm font-black ${
                                proceso.difNoCumple < 0
                                  ? 'text-emerald-600'
                                  : proceso.difNoCumple > 0
                                    ? 'text-rose-600'
                                    : 'text-slate-700'
                              }`}
                            >
                              {formatVariacion(proceso.difNoCumple)}
                            </span>
                          </div>

                          <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Variación Por Revisar
                            </span>
                            <span
                              className={`text-sm font-black ${
                                proceso.difPorRevisar < 0 ? 'text-sky-600' : 'text-slate-700'
                              }`}
                            >
                              {formatVariacion(proceso.difPorRevisar)}
                            </span>
                          </div>

                          <div className="rounded-xl border border-sky-200 bg-white p-2.5 text-center">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Variación Cumple
                            </span>
                            <span
                              className={`text-sm font-black ${
                                proceso.difCumple > 0 ? 'text-emerald-600' : 'text-slate-700'
                              }`}
                            >
                              {formatVariacion(proceso.difCumple)}
                            </span>
                          </div>
                        </div>

                        {/* Tabla de Comparación Objetiva */}
                        <div className="mt-4 overflow-hidden rounded-xl border border-sky-200 bg-white">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-sky-100 bg-sky-50/70 text-[10px] font-bold uppercase tracking-wider text-sky-950">
                                <tr>
                                  <th scope="col" className="px-3 py-2">
                                    Indicador Técnico Declarado
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-center">
                                    Original ({original.fecha_corta ?? original.fecha})
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-center">
                                    Última ({proceso.ultimaEvaluacion.fecha_corta ?? proceso.ultimaEvaluacion.fecha})
                                  </th>
                                  <th scope="col" className="px-3 py-2 text-center">
                                    Variación Numérica
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                <tr>
                                  <td className="px-3 py-2">Condiciones Cumple</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {original.conteo_condiciones?.cumple ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {proceso.ultimaEvaluacion.conteo_condiciones?.cumple ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-emerald-600">
                                    {formatVariacion(proceso.difCumple)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2">Incumplimientos Declarados (No Cumple)</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {original.conteo_condiciones?.no_cumple ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {proceso.ultimaEvaluacion.conteo_condiciones?.no_cumple ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-rose-600">
                                    {formatVariacion(proceso.difNoCumple)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2">Condiciones Por Revisar</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {original.conteo_condiciones?.por_revisar ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {proceso.ultimaEvaluacion.conteo_condiciones?.por_revisar ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-amber-600">
                                    {formatVariacion(proceso.difPorRevisar)}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2">Condiciones No Aplica (NA)</td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {original.conteo_condiciones?.na ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-900">
                                    {proceso.ultimaEvaluacion.conteo_condiciones?.na ?? '-'}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold text-slate-600">
                                    {formatVariacion(proceso.difNa)}
                                  </td>
                                </tr>
                                <tr className="bg-sky-50/30 font-bold">
                                  <td className="px-3 py-2 text-slate-900">Preparación Declarada</td>
                                  <td className="px-3 py-2 text-center text-slate-900">
                                    {original.porcentaje_cumplimiento}%
                                  </td>
                                  <td className="px-3 py-2 text-center text-slate-900">
                                    {proceso.ultimaEvaluacion.porcentaje_cumplimiento}%
                                  </td>
                                  <td className="px-3 py-2 text-center text-sky-900">
                                    {formatVariacion(proceso.difPorcentaje, '%')}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-sky-100 bg-sky-50/50 p-2.5 text-[10px] text-sky-900">
                            <strong>Nota técnica:</strong> Los valores corresponden exclusivamente a las respuestas
                            declaradas por el responsable del establecimiento en cada autoevaluación. No constituyen
                            conclusiones oficiales ni convalidación municipal.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* C. Mi Historial de Autoevaluaciones Preventivas */}
                    <section
                      aria-label={`Historial preventivo de ${proceso.nombre_comercio}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                          Mi Historial de Autoevaluaciones Preventivas
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <Hash className="h-3 w-3 text-slate-400" />
                          {filasHistorial.length} registro{filasHistorial.length > 1 ? 's' : ''} · UUIDs independientes
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-xs">
                          <thead className="border-b border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th scope="col" className="px-4 py-2.5">Registro</th>
                              <th scope="col" className="px-4 py-2.5">Fecha</th>
                              <th scope="col" className="px-4 py-2.5">Estado</th>
                              <th scope="col" className="hidden px-4 py-2.5 sm:table-cell">Semáforo</th>
                              <th scope="col" className="px-4 py-2.5 text-center">Preparación</th>
                              <th scope="col" className="px-4 py-2.5 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filasHistorial.map(({ item, etiqueta }) => {
                              const cfg = configSemaforo[item.semaforo] ?? configPorDefecto;
                              const IconoSemaforo = cfg.icon;
                              const iniciado = item.estado === 'INICIADA';

                              return (
                                <tr key={item.id} className="transition hover:bg-slate-50">
                                  <td className="px-4 py-3">
                                    <span className={`block font-bold ${etiqueta === 'Original' ? 'text-slate-900' : 'text-slate-700'}`}>
                                      {etiqueta}
                                    </span>
                                    {item.codigo_acceso && (
                                      <span className="mt-0.5 block font-mono text-[10px] text-slate-500 select-all">
                                        {item.codigo_acceso}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    <span className="block">{item.fecha_corta ?? item.fecha}</span>
                                    {item.registrada_at && (
                                      <span className="mt-0.5 block text-[10px] text-slate-400">
                                        Reg. {item.registrada_at}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
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
                                  </td>
                                  <td className="hidden px-4 py-3 sm:table-cell">
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                                      <IconoSemaforo className="h-3 w-3" />
                                      {item.semaforo}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center font-black text-slate-900">
                                    {item.porcentaje_cumplimiento}%
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                                      {iniciado ? (
                                        <Link
                                          href={`/autoevaluacion/${item.uuid_trazabilidad}/checklist`}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95"
                                        >
                                          <span>Continuar Checklist</span>
                                          <ArrowRight className="h-3 w-3" />
                                        </Link>
                                      ) : (
                                        <>
                                          <Link
                                            href={`/autoevaluacion/${item.uuid_trazabilidad}/resumen`}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                                          >
                                            <Eye className="h-3 w-3 text-slate-500" />
                                            <span>Ver Resumen</span>
                                          </Link>
                                          <Link
                                            href={`/autoevaluacion/informe/${item.uuid_trazabilidad}`}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
                                          >
                                            <FileText className="h-3 w-3 text-slate-500" />
                                            <span>Ver Informe</span>
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
                    </section>

                    {!esFlujoNuevo && tieneReev && (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/60 px-2.5 py-1.5 text-[11px] text-amber-900">
                        <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        <span>
                          Las reevaluaciones de este establecimiento pertenecen a una versión anterior de la plataforma. Se conservan con fines de trazabilidad.
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
