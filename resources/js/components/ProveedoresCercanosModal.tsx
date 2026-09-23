import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, MapPin, Phone, MessageCircle, ExternalLink, Loader2, Search, Navigation } from 'lucide-react';

export interface ProveedorCercano {
  id: number;
  razon_social: string;
  nombre_comercial?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  latitud: number;
  longitud: number;
  servicios_ofrecidos?: string | null;
  distancia_km: number;
}

interface RespuestaProveedores {
  codigo: string;
  categoria: string;
  radio_km: number;
  radio_extendido: boolean;
  proveedores: ProveedorCercano[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  codigo: string | null;
  nombreItem?: string | null;
}

const FALLBACK_LAT = -12.068;
const FALLBACK_LON = -75.21;

const OPCIONES_RADIO = [
  { etiqueta: '5 km', valor: 5 },
  { etiqueta: '10 km', valor: 10 },
  { etiqueta: 'Valle del Mantaro', valor: 25 },
];

function whatsappUrl(numero: string | null): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '');

  return digitos ? `https://wa.me/${digitos}` : null;
}

function osmUrl(latitud: number, longitud: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitud}&mlon=${longitud}#map=16/${latitud}/${longitud}`;
}

export const ProveedoresCercanosModal: React.FC<Props> = ({ isOpen, onClose, codigo, nombreItem }) => {
  const [radio, setRadio] = useState<number>(5);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState<RespuestaProveedores | null>(null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lon: number } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const cargarProveedores = useCallback(
    async (lat: number, lon: number, radioKm: number) => {
      if (!codigo) return;

      setCargando(true);
      setError(null);

      try {
        const params = new URLSearchParams({ lat: String(lat), lon: String(lon), radio: String(radioKm) });
        const res = await fetch(`/autoevaluacion/recursos-cercanos/${encodeURIComponent(codigo)}?${params}`);

        if (!res.ok) {
          throw new Error('No fue posible consultar los recursos cercanos en este momento.');
        }

        setRespuesta((await res.json()) as RespuestaProveedores);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error de red al consultar los recursos cercanos.');
      } finally {
        setCargando(false);
      }
    },
    [codigo]
  );

  const resolverUbicacion = useCallback(
    (radioKm: number) => {
      const usarFallback = (lat: number, lon: number) => {
        setUbicacion({ lat, lon });
        cargarProveedores(lat, lon, radioKm);
      };

      if (!navigator.geolocation) {
        usarFallback(FALLBACK_LAT, FALLBACK_LON);

        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => usarFallback(pos.coords.latitude, pos.coords.longitude),
        () => usarFallback(FALLBACK_LAT, FALLBACK_LON),
        { timeout: 5000 }
      );
    },
    [cargarProveedores]
  );

  useEffect(() => {
    if (!isOpen || !codigo) return;

    setRespuesta(null);
    setError(null);
    setUbicacion(null);
    setRadio(5);
    resolverUbicacion(5);
  }, [isOpen, codigo, resolverUbicacion]);

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

  const cambiarRadio = (valor: number) => {
    setRadio(valor);
    setRespuesta(null);
    if (ubicacion) {
      cargarProveedores(ubicacion.lat, ubicacion.lon, valor);
    } else {
      resolverUbicacion(valor);
    }
  };

  if (!isOpen || !codigo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recursos-cercanos-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl border border-neutral-100 text-left"
        onClick={event => event.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-[#7f1d1d] border border-rose-100 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Directorio Comunitario · Valle del Mantaro
              </span>
              <h3 id="recursos-cercanos-titulo" className="text-sm font-bold text-neutral-900 leading-snug">
                Recursos cercanos en Huancayo
              </h3>
              {nombreItem && (
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  <span className="font-mono font-bold text-[#7f1d1d]">{codigo}</span> · {nombreItem}
                </p>
              )}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar directorio de recursos cercanos"
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de radio de búsqueda */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1.5">
            Radio de búsqueda
          </label>
          <div className="grid grid-cols-3 gap-2">
            {OPCIONES_RADIO.map(opcion => (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => cambiarRadio(opcion.valor)}
                className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  radio === opcion.valor
                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold ring-1 ring-rose-300'
                    : 'bg-white border-neutral-200 text-neutral-600 font-medium hover:bg-neutral-50'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
          {ubicacion && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
              <Navigation className="w-3 h-3" />
              Resultados medidos desde tu ubicación actual
            </p>
          )}
        </div>

        {/* Estado de carga / error */}
        {cargando && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-500 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Localizando recursos cercanos...
          </div>
        )}

        {!cargando && error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-[#7f1d1d] font-medium">
            {error}
          </div>
        )}

        {!cargando && !error && respuesta && (
          <>
            {respuesta.radio_extendido && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-3 flex items-start gap-2">
                <Search className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Sin resultados dentro del radio seleccionado; se muestran los proveedores más cercanos del Valle del Mantaro.
                </span>
              </div>
            )}

            {respuesta.proveedores.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 text-center">
                <MapPin className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">
                  Aún no hay proveedores registrados para la categoría{' '}
                  <strong className="font-mono">{respuesta.categoria}</strong>.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                {respuesta.proveedores.map(proveedor => {
                  const wa = whatsappUrl(proveedor.whatsapp);
                  const nombre = proveedor.nombre_comercial || proveedor.razon_social;

                  return (
                    <div key={proveedor.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 bg-white">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900">{nombre}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                            <MapPin className="w-3 h-3" /> A {proveedor.distancia_km.toFixed(1)} km
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                          {[proveedor.distrito, proveedor.direccion].filter(Boolean).join(' · ')}
                        </p>
                        {proveedor.servicios_ofrecidos && (
                          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                            {proveedor.servicios_ofrecidos}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          {proveedor.telefono && (
                            <a
                              href={`tel:${proveedor.telefono}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <Phone className="w-3 h-3" /> Llamar
                            </a>
                          )}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </a>
                          )}
                          <a
                            href={osmUrl(proveedor.latitud, proveedor.longitud)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1.5 rounded-lg transition"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver en el mapa
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[10px] leading-relaxed text-neutral-500">
              Información referencial comunitaria. No implica recomendación, garantía ni relación con la inspección oficial.
            </div>
          </>
        )}

        <div className="mt-5 flex items-center gap-3">
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