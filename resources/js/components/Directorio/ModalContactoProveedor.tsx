import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FileCheck,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AliadoAsistenciaContrato } from '@/types/contrato';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  aliado: AliadoAsistenciaContrato | null;
  distritoSeleccionado?: string | null;
}

export function ModalContactoProveedor({
  isOpen,
  onClose,
  aliado,
  distritoSeleccionado,
}: Props) {
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || !aliado) {
    return null;
  }

  const distrito = distritoSeleccionado || aliado.sede || 'Huancayo';
  const servicioTexto = aliado.entregable_oficial
    ? aliado.entregable_oficial
    : aliado.servicios && aliado.servicios.length > 0
      ? aliado.servicios[0]
      : 'adecuación de seguridad ITSE';

  const plantillaMensaje = `Hola ${aliado.nombre_comercial}, encontré su contacto en el Directorio Cívico CheckITSE Huancayo. Requiero cotización para [${servicioTexto}] para mi local comercial en ${distrito}.`;

  const numeroWhatsapp = (aliado.whatsapp || aliado.telefono || '').replace(/\D/g, '');
  const urlWhatsapp = numeroWhatsapp
    ? `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(plantillaMensaje)}`
    : null;

  const numeroTelefono = (aliado.telefono || '').replace(/\D/g, '');

  const copiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(plantillaMensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-contacto-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Contacto Cívico Transparente
            </span>
            <h2 id="modal-contacto-titulo" className="text-lg font-black text-slate-900 leading-tight">
              {aliado.nombre_comercial}
            </h2>
            {aliado.contacto_nombre && (
              <p className="text-xs text-slate-500 font-medium">
                Atención: {aliado.contacto_nombre}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de contacto"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Acreditación Técnica y Ubicación */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {aliado.acreditacion && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 font-bold text-sky-900">
              <FileCheck className="h-3.5 w-3.5 text-sky-700" />
              {aliado.acreditacion}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {aliado.sede} · Cobertura: {aliado.cobertura || 'Huancayo'}
          </span>
        </div>

        {/* Entregable Oficial para Mesa de Partes */}
        {aliado.entregable_oficial && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              <FileCheck className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
              <span>Entregable Oficial para Mesa de Partes (Huancayo)</span>
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              {aliado.entregable_oficial}
            </p>
          </div>
        )}

        {/* Plantilla de Mensaje para Cotización */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Plantilla de mensaje de contacto recomendada:
            </label>
            <button
              type="button"
              onClick={copiarMensaje}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
            >
              {copiado ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiado ? '¡Copiado!' : 'Copiar texto'}</span>
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed font-mono select-all">
            {plantillaMensaje}
          </div>
        </div>

        {/* Deslinde de No Intermediación */}
        <p className="text-[11px] leading-relaxed text-slate-500">
          CheckITSE Huancayo es una iniciativa académica/cívica. No cobra comisiones, no fija precios ni intermedia en la contratación. Toda cotización y acuerdo es 100% privado entre el comercio y el especialista.
        </p>

        {/* Botonera de Contacto */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
          {urlWhatsapp ? (
            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Continuar por WhatsApp</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          ) : null}

          {numeroTelefono ? (
            <a
              href={`tel:${numeroTelefono}`}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Phone className="h-4 w-4 text-slate-500" />
              <span>Llamar</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-transparent px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
