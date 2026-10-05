import React, { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  Scale,
  X,
} from 'lucide-react';

export interface GuiaPedagogicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  codigo?: string;
  titulo?: string;
  explicacionCotidiana?: string;
  queObservar?: string;
  correcto?: string[];
  incorrecto?: string[];
  normaBase?: string | null;
  articuloReferencia?: string | null;
}

export function GuiaPedagogicaModal({
  isOpen,
  onClose,
  codigo,
  titulo,
  explicacionCotidiana,
  queObservar,
  correcto = [],
  incorrecto = [],
  normaBase,
  articuloReferencia,
}: GuiaPedagogicaModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guia-pedagogica-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop click to dismiss */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 z-10 space-y-4 p-5 sm:p-7 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-900">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                Guía Visual Pedagógica
              </span>
              {codigo && (
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  {codigo}
                </span>
              )}
            </div>
            <h2
              id="guia-pedagogica-titulo"
              className="text-base sm:text-lg font-black text-slate-900 leading-snug"
            >
              {titulo || '¿Cómo verificar esta condición en tu local?'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía pedagógica"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. En palabras sencillas (Explicación breve de 2 líneas) */}
        {explicacionCotidiana && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-900">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span>¿Por qué me piden esto? (En palabras sencillas)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {explicacionCotidiana}
            </p>
          </div>
        )}

        {/* 2. Cuadrícula comparativa: Correcto vs. Incorrecto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Columna Conforme (Correcto) */}
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50/40 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-200/80 pb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">
                🟢 Condición Conforme (Correcto)
              </span>
            </div>
            {correcto.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {correcto.map((punto) => (
                  <li key={punto} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Verifica que el componente cumpla con las especificaciones técnicas del manual.
              </p>
            )}
          </div>

          {/* Columna Alerta (Incorrecto) */}
          <div className="rounded-2xl border border-rose-300 bg-rose-50/40 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-rose-900 border-b border-rose-200/80 pb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider">
                🔴 Señales de Alerta (Incorrecto)
              </span>
            </div>
            {incorrecto.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
                {incorrecto.map((punto) => (
                  <li key={punto} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Cualquier daño físico, obstrucción o falta de mantenimiento genera observación técnica.
              </p>
            )}
          </div>
        </div>

        {/* 3. Qué observar durante la inspección (si está disponible) */}
        {queObservar && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
              <span>Qué revisa el inspector CENEPRED en tu local:</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {queObservar}
            </p>
          </div>
        )}

        {/* 4. Pie con Base Normativa y Botón de Cierre */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
          {(normaBase || articuloReferencia) ? (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Scale className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>
                Base normativa: <strong>{normaBase}</strong> {articuloReferencia ? `(${articuloReferencia})` : ''}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              Referencia oficial CENEPRED / D.S. N° 002-2018-PCM
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
          >
            Entendido, volver a la pregunta
          </button>
        </div>
      </div>
    </div>
  );
}
