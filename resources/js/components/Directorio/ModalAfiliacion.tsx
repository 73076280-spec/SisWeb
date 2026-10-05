import React, { useCallback, useEffect, useRef } from 'react';
import { Mail, MessageCircle, Phone, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Numero de WhatsApp institucional, ya normalizado. Vacio = se muestra el modal. */
    whatsapp: string;
}

/**
 * Captacion de prestadores sin canal de contacto configurado.
 *
 * Es el respaldo de `VITE_WHATSAPP_ALIADOS`: sin un numero real de la
 * operacion, el CTA no debe enlazar un numero ficticio, y el comerciante
 * tecnico necesita una via de contacto real para afiliarse.
 */
export const ModalAfiliacion: React.FC<Props> = ({ isOpen, onClose, whatsapp }) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const manejarTeclado = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();

                return;
            }

            if (event.key !== 'Tab') return;

            const panel = panelRef.current;
            if (!panel) return;

            const enfocables = Array.from(
                panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
            );

            if (enfocables.length === 0) return;

            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];

            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;

        const anteriormenteFocalizado = document.activeElement as HTMLElement | null;

        document.addEventListener('keydown', manejarTeclado);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', manejarTeclado);
            document.body.style.overflow = '';
            anteriormenteFocalizado?.focus?.();
        };
    }, [isOpen, manejarTeclado]);

    if (!isOpen) return null;

    const mensaje = whatsapp
        ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
              'Hola equipo de CheckITSE, tengo un negocio de [Rubro/Tienda] en Huancayo y deseo información sobre los planes para figurar en el directorio de proveedores.',
          )}`
        : null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-afiliacion-titulo"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold tracking-wider text-emerald-600 uppercase">
                            Directorio de proveedores
                        </span>
                        <h2 id="modal-afiliacion-titulo" className="mt-1 text-base leading-snug font-bold text-slate-900">
                            Anúnciate en CheckITSE Huancayo
                        </h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar la información de afiliación"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="space-y-4 px-5 py-5">
                    <p className="text-sm leading-relaxed text-slate-600">
                        Figura frente a comerciantes que buscan subsanar sus observaciones ITSE. La inclusión
                        es gratuita y CheckITSE no cobra comisiones ni interviene en la contratación.
                    </p>

                    {mensaje ? (
                        <a
                            href={mensaje}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Escribir por WhatsApp
                        </a>
                    ) : (
                        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs leading-relaxed text-slate-600">
                                Contáctanos para afiliar tu empresa o servicio técnico:
                            </p>
                            {/* TODO(operaciones): reemplazar por el numero y correo
                                reales de la operacion antes de publicar. */}
                            <p className="flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                                9XXXXXXXX
                            </p>
                            <p className="flex items-center gap-2.5 text-sm font-semibold break-all text-slate-900">
                                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                                contacto@checkitse.pe
                            </p>
                        </div>
                    )}

                    <p className="text-[11px] leading-relaxed text-slate-500">
                        La publicación en el directorio no constituye certificación ni vínculo con la Unidad de
                        ITSE de la Municipalidad Provincial de Huancayo.
                    </p>
                </div>

                <footer className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] w-full cursor-pointer rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                    >
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};
