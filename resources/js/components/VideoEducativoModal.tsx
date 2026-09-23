import React, { useEffect, useRef } from 'react';
import { X, BookOpen, PlayCircle, FileCheck, Scale, ExternalLink } from 'lucide-react';

export interface RecursoEducativoData {
  titulo: string;
  video_url: string | null;
  tipo?: string | null;
  base_legal?: string | null;
  evidencia_sugerida?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recurso: RecursoEducativoData | null;
}

function youtubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})|youtu\.be\/([\w-]{11})/
  );

  const id = match ? match[1] || match[2] : null;

  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export const VideoEducativoModal: React.FC<Props> = ({ isOpen, onClose, recurso }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !recurso) return null;

  const embedUrl = recurso.video_url ? youtubeEmbedUrl(recurso.video_url) : null;
  const esRecursoWeb = Boolean(recurso.video_url) && !embedUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-educativo-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-100 text-left"
        onClick={event => event.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-[#7f1d1d] border border-rose-100 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Micro-learning · Guía Técnica Rápida
              </span>
              <h3 id="video-educativo-titulo" className="text-sm font-bold text-neutral-900 leading-snug">
                {recurso.titulo}
              </h3>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía o video educativo"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reproductor de video YouTube o enlace externo */}
        <div className="mb-5">
          {embedUrl ? (
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200">
              <iframe
                src={embedUrl}
                title={recurso.titulo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : esRecursoWeb ? (
            <a
              href={recurso.video_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir recurso educativo en una nueva pestaña</span>
            </a>
          ) : null}
        </div>

        {/* Base Legal */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 mb-3 flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
          <Scale className="w-4 h-4 text-[#7f1d1d] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[10px] uppercase tracking-wider text-[#7f1d1d] block mb-0.5">
              Base Legal
            </strong>
            <span className="font-mono text-[11px]">{recurso.base_legal || '—'}</span>
          </div>
        </div>

        {/* Evidencia orientativa esperada */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 mb-5 flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
          <FileCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-[10px] uppercase tracking-wider text-emerald-800 block mb-0.5">
              Evidencia orientativa esperada
            </strong>
            <span>{recurso.evidencia_sugerida || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {recurso.video_url && embedUrl && (
            <a
              href={recurso.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-[#7f1d1d] transition cursor-pointer"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Ver en YouTube
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};