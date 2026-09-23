import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Navbar } from '@/components/Navbar';
import { GuiaModal } from '@/components/GuiaModal';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hash,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Store,
} from 'lucide-react';

interface ResumenSubsanaciones {
  total: number;
  subsanadas: number;
  en_proceso: number;
  pendientes: number;
}

interface AutoevaluacionItem {
  id: number;
  uuid_trazabilidad: string;
  nombre_comercio: string;
  funcion_economica: string;
  semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
  porcentaje_cumplimiento: number;
  fecha: string;
  resumen_subsanaciones: ResumenSubsanaciones;
}

interface Props {
  autoevaluaciones: AutoevaluacionItem[];
}

const configSemaforo = {
  VERDE: {
    label: 'Nivel Verde',
    icono: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  AMBAR: {
    label: 'Nivel Ámbar',
    icono: AlertTriangle,
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  ROJO: {
    label: 'Nivel Rojo',
    icono: ShieldAlert,
    badge: 'bg-rose-100 text-[#7f1d1d] border-rose-200',
  },
};

const configPorDefecto = {
  label: 'Nivel Autoevaluado',
  icono: ShieldCheck,
  badge: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

export default function MisAutoevaluaciones({ autoevaluaciones }: Props) {
  const [showGuia, setShowGuia] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-sans antialiased flex flex-col justify-between">
      <Head title="Mis Autoevaluaciones - CheckITSE Huancayo" />
      <Navbar />
      <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-[#7f1d1d] border border-rose-100 px-3 py-1 rounded-full">
              Panel de Retención Ciudadana
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-2">
              Mis Autoevaluaciones
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-lg">
              Tus autoevaluaciones preventivas guardadas. Retoma tu plan de subsanación o revisa tu informe cuando lo necesites.
            </p>
          </div>

          <Link
            href="/autoevaluacion"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7f1d1d] hover:bg-[#991b1b] px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            + Nueva Autoevaluación
          </Link>
        </div>

        {autoevaluaciones.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-neutral-200/80 text-center shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
              <ClipboardList className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 mt-4">Aún no tienes autoevaluaciones guardadas</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto leading-relaxed">
              Cuando completes una autoevaluación preventiva y guardes tu progreso en esta cuenta,
              aparecerá aquí para que la retomes cuando quieras.
            </p>
            <Link
              href="/autoevaluacion"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7f1d1d] hover:bg-[#991b1b] px-5 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              Comenzar mi autoevaluación preventiva
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {autoevaluaciones.map(item => {
              const cfg = configSemaforo[item.semaforo] ?? configPorDefecto;
              const IconoSemaforo = cfg.icono;
              const subsanaciones = item.resumen_subsanaciones;

              return (
                <article
                  key={item.id}
                  className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-500 shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-neutral-900 truncate">
                          {item.nombre_comercio}
                        </h3>
                        <span className="text-[11px] text-neutral-500">
                          Giro: {item.funcion_economica}
                        </span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${cfg.badge}`}>
                      <IconoSemaforo className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.fecha}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono truncate">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.uuid_trazabilidad}</span>
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-bold text-neutral-600 uppercase tracking-wider">
                        Preparación declarada
                      </span>
                      <span className="font-extrabold text-neutral-900">
                        {item.porcentaje_cumplimiento}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.semaforo === 'VERDE'
                            ? 'bg-emerald-500'
                            : item.semaforo === 'ROJO'
                              ? 'bg-[#7f1d1d]'
                              : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.porcentaje_cumplimiento}%` }}
                      />
                    </div>
                  </div>

                  {subsanaciones.total > 0 && (
                    <div className="mt-4 flex items-center gap-2 flex-wrap text-[10px] font-bold">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                        {subsanaciones.subsanadas} Subsanadas
                      </span>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-900 rounded-xl border border-amber-200">
                        {subsanaciones.en_proceso} En Proceso
                      </span>
                      <span className="px-2.5 py-1 bg-rose-50 text-[#7f1d1d] rounded-xl border border-rose-200">
                        {subsanaciones.pendientes} Pendientes
                      </span>
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center gap-2 justify-end">
                    <Link
                      href={`/autoevaluacion/informe/${item.uuid_trazabilidad}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 px-3.5 py-2 rounded-xl hover:bg-neutral-50 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Informe
                    </Link>
                    <Link
                      href={`/autoevaluacion/subsanacion/${item.uuid_trazabilidad}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7f1d1d] hover:bg-[#991b1b] px-3.5 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      Continuar Subsanación
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-100 py-6 text-center text-[11px] text-neutral-400">
        CheckITSE Huancayo · Panel de Retención Ciudadana · R.J. N° 016-2018-CENEPRED
      </footer>
    </div>
  );
}