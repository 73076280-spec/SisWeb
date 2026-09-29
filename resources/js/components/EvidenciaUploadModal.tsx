import React, { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X, FileText, ImagePlus, Upload, Loader2, CheckCircle2, Info } from 'lucide-react';

export type EstadoSubsanacionModal = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uuid: string;
  codigoItem: string;
  nombreItem?: string;
  estadoInicial?: EstadoSubsanacionModal;
  accionInicial?: string;
}

const MAX_EVIDENCIA_MB = 5;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const ESTADOS: Array<{
  valor: EstadoSubsanacionModal;
  etiqueta: string;
  activo: string;
}> = [
  {
    valor: 'PENDIENTE',
    etiqueta: 'Pendiente',
    activo: 'bg-neutral-200 text-neutral-800 ring-1 ring-neutral-300',
  },
  {
    valor: 'EN_PROCESO',
    etiqueta: 'En Proceso',
    activo: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  },
  {
    valor: 'SUBSANADO_DECLARADO',
    etiqueta: 'Declarado Subsanado',
    activo: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
  },
];

export const EvidenciaUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  uuid,
  codigoItem,
  nombreItem,
  estadoInicial = 'EN_PROCESO',
  accionInicial = '',
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const elementoPrevioRef = useRef<HTMLElement | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<number>(0);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);

  const form = useForm({
    codigo_item: codigoItem,
    descripcion_subsanacion: accionInicial,
    estado: estadoInicial,
    evidencia: null as File | null,
  });

  useEffect(() => {
    if (!isOpen) return;

    // Conserva el foco del control que abriÃ³ el modal para restaurarlo al cerrar.
    if (elementoPrevioRef.current === null) {
      elementoPrevioRef.current = document.activeElement as HTMLElement | null;
    }

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

  useEffect(() => {
    if (isOpen) return;

    const elementoPrevio = elementoPrevioRef.current;
    elementoPrevioRef.current = null;

    if (elementoPrevio?.isConnected) {
      elementoPrevio.focus();
    }
  }, [isOpen]);

  const seleccionarArchivo = (file: File | null) => {
    setErrorCliente(null);

    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }

    if (!file) {
      setArchivo(null);
      form.setData('evidencia', null);

      return;
    }

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setErrorCliente('Solo se permiten imÃ¡genes JPG/PNG/WEBP o documentos PDF.');
      inputFileRef.current?.focus();

      return;
    }

    if (file.size > MAX_EVIDENCIA_MB * 1024 * 1024) {
      setErrorCliente(`El archivo supera el lÃ­mite de ${MAX_EVIDENCIA_MB} MB.`);
      inputFileRef.current?.focus();

      return;
    }

    setArchivo(file);
    form.setData('evidencia', file);

    if (file.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (form.data.descripcion_subsanacion.trim().length < 5) {
      form.setError('descripcion_subsanacion', 'Describe la acciÃ³n correctiva realizada (mÃ­nimo 5 caracteres).');

      return;
    }

    setProgreso(0);
    form.post(`/autoevaluacion/subsanacion/${uuid}`, {
      onProgress: progress => setProgreso(progress?.percentage ?? 0),
      onSuccess: () => {
        setProgreso(0);
        onClose();
      },
      preserveScroll: true,
      forceFormData: true,
    });
  };

  if (!isOpen) return null;

  const esImagen = Boolean(preview);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidencia-upload-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-100 text-left"
        onClick={event => event.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-danger-900 border border-rose-100 shrink-0">
              <ImagePlus className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                GestiÃ³n de Evidencias Â· Plan Preventivo
              </span>
              <h3 id="evidencia-upload-titulo" className="text-sm font-bold text-neutral-900 leading-snug">
                Registrar evidencia y estado
              </h3>
              {nombreItem && (
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  <span className="font-mono font-bold text-danger-900">{codigoItem}</span> Â· {nombreItem}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar registro de evidencia"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Estado declarado */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1.5">
              Estado Declarado de tu AdecuaciÃ³n
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ESTADOS.map(opcion => (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => form.setData('estado', opcion.valor)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    form.data.estado === opcion.valor
                      ? `${opcion.activo} border-transparent`
                      : 'bg-white border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50'
                  }`}
                >
                  {opcion.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* AcciÃ³n correctiva realizada */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
              AcciÃ³n correctiva realizada
            </label>
            <textarea
              rows={3}
              value={form.data.descripcion_subsanacion}
              onChange={event => form.setData('descripcion_subsanacion', event.target.value)}
              placeholder="Describe los trabajos o acciones realizadas, marcas y especificaciones tÃ©cnicas implementadas..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-danger-900 outline-none"
            />
            {form.errors.descripcion_subsanacion && (
              <p className="mt-1 text-[11px] font-medium text-danger-900">{form.errors.descripcion_subsanacion}</p>
            )}
          </div>

          {/* SelecciÃ³n de archivo */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
              Evidencia (JPG, PNG, WEBP o PDF Â· mÃ¡ximo {MAX_EVIDENCIA_MB} MB)
            </label>
            <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:border-danger-900/40 transition cursor-pointer text-center">
              <Upload className="w-6 h-6" />
              {archivo ? (
                <span className="text-xs font-semibold text-neutral-700">
                  {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              ) : (
                <span className="text-xs">Selecciona una imagen o documento PDF de evidencia</span>
              )}
              <input
                ref={inputFileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                aria-describedby="evidencia-nota-declaracion"
                className="hidden"
                onChange={event => seleccionarArchivo(event.target.files?.[0] || null)}
              />
            </label>

            <p
              id="evidencia-nota-declaracion"
              className="mt-2 flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-[10px] leading-relaxed text-sky-900"
            >
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                La evidencia es <strong>declarada por el ciudadano</strong> y respalda tu adecuaciÃ³n con fines
                preventivos; no es verificada oficialmente por la autoridad competente y se conserva de forma
                privada, accesible solo para ti.
              </span>
            </p>

            {/* PrevisualizaciÃ³n */}
            {esImagen && preview && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50">
                <img src={preview} alt="PrevisualizaciÃ³n de la evidencia" className="max-h-56 w-full object-contain" />
              </div>
            )}
            {archivo && !esImagen && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium">
                <FileText className="w-4 h-4 shrink-0" />
                Documento PDF seleccionado para respaldar tu declaraciÃ³n.
              </div>
            )}

            {errorCliente && (
              <p className="mt-1 text-[11px] font-medium text-danger-900">{errorCliente}</p>
            )}
            {form.errors.evidencia && (
              <p className="mt-1 text-[11px] font-medium text-danger-900">{form.errors.evidencia}</p>
            )}
            <div aria-live="polite" className="sr-only">
              {errorCliente || form.errors.evidencia || ''}
            </div>
          </div>

          {/* Barra de progreso */}
          {form.processing && (
            <div aria-live="polite">
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-500 font-medium">
                {progreso < 100 ? `Subiendo evidencia... ${Math.round(progreso)}%` : 'Guardando registro...'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={form.processing}
              className="flex-1 py-3 rounded-xl bg-danger-900 hover:bg-danger-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {form.processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {form.processing ? 'Procesando...' : 'Registrar evidencia y estado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
