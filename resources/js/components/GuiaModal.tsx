import React, { useEffect, useRef } from 'react';
import { X, BookOpen, ShieldCheck, Scale, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GuiaModal: React.FC<Props> = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guia-modal-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-100 text-left"
        onClick={event => event.stopPropagation()}
      >
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 rounded-xl text-danger-900 border border-rose-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 id="guia-modal-titulo" className="text-sm font-bold text-neutral-900">
                Compendio Normativo ITSE y Base Legal
              </h3>
              <span className="text-[10px] text-neutral-400 font-mono">
                D.S. NÂ° 002-2018-PCM Â· R.J. NÂ° 016-2018-CENEPRED
              </span>
            </div>
          </div>
          <button 
            ref={closeButtonRef}
            type="button"
            onClick={onClose} 
            aria-label="Cerrar guÃ­a normativa"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DeclaraciÃ³n de Naturaleza CÃ­vica Preventiva */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 mb-4 flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-danger-900 shrink-0 mt-0.5" />
          <div>
            <strong className="text-neutral-900 block font-semibold mb-0.5">
              CarÃ¡cter del Simulador CÃ­vico:
            </strong>
            Herramienta pedagÃ³gica y preventiva independiente. Permite al comerciante revisar por su cuenta las condiciones tÃ©cnicas de seguridad de su establecimiento y prepararse mejor antes de una eventual inspecciÃ³n, reduciendo la asimetrÃ­a informativa y promoviendo una cultura de prevenciÃ³n.
          </div>
        </div>

        {/* ClasificaciÃ³n de Modalidad de TrÃ¡mite */}
        <div className="mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
            ClasificaciÃ³n de Riesgo segÃºn FunciÃ³n y Escala FÃ­sica
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ITSE Posterior */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Riesgo Bajo / Medio
                </span>
                <Scale className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <h4 className="font-bold text-xs text-emerald-950">ITSE Posterior (Ex-Post)</h4>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Aplica a comercios con Ã¡rea techada â‰¤ 750 mÂ² y hasta 3 pisos sin factores agravantes. La Licencia de Funcionamiento se tramita previamente y la verificaciÃ³n tÃ©cnica se realiza con posterioridad.
              </p>
            </div>

            {/* ITSE Previa */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-danger-900 uppercase tracking-wider">
                  Riesgo Alto / Muy Alto
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-danger-900" />
              </div>
              <h4 className="font-bold text-xs text-rose-950">ITSE Previa (Ex-Ante)</h4>
              <p className="text-[11px] text-rose-950 leading-relaxed">
                Aplica cuando el Ã¡rea supera 750 mÂ², mÃ¡s de 3 pisos, giros especiales (hospedaje/salud &gt;100 pers.), presencia de calderos o GLP &gt; 118.18 galones. Exige inspecciÃ³n tÃ©cnica favorable previa a la licencia.
              </p>
            </div>
          </div>
        </div>

        {/* Articulado TÃ©cnico de Referencia */}
        <div className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white space-y-2 mb-4 text-[11px] text-neutral-600">
          <strong className="block text-xs font-bold text-neutral-800">
            Marco Reglamentario Aplicado en el Checklist:
          </strong>
          <ul className="list-disc list-inside space-y-1 text-neutral-500 font-mono text-[10px]">
            <li><strong>ProtecciÃ³n contra Incendios:</strong> NTP 350.043-1 / RNE A.130 Art. 163</li>
            <li><strong>Instalaciones ElÃ©ctricas:</strong> CNE-U Reglas 020.132, 150-400 / R.M. 175-2008-MEM</li>
            <li><strong>EvacuaciÃ³n y Aforo:</strong> RNE A.010 Arts. 20, 25 / NTP 399.010-1</li>
            <li><strong>Resiliencia SÃ­smica Huancayo:</strong> RNE E.030 / Arriola (2024)</li>
          </ul>
        </div>

        <p className="text-[10px] text-neutral-400 text-center mb-4 leading-relaxed">
          Sustento AcadÃ©mico: Modelado algorÃ­tmico de riesgo bajo ISO 9126 (Quispe Yana, 2019) y simulaciÃ³n preventiva para reducciÃ³n de siniestralidad (Revista G-Nerando, 2024).
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
