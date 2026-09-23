import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogIn,
  Save,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';

type Pestania = 'crear' | 'iniciar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uuid?: string | null;
  establecimiento?: string | null;
}

function obtenerCsrf(): string {
  if (typeof document === 'undefined') return '';

  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export const ModalGuardarProgreso: React.FC<Props> = ({
  isOpen,
  onClose,
  uuid = null,
  establecimiento = null,
}) => {
  const [pestania, setPestania] = useState<Pestania>('crear');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPestania('crear');
    setNombre('');
    setTelefono('');
    setEmail('');
    setPassword('');
    setError(null);
    setCargando(false);
    setGuardado(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const manejarEnvio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const endpoint = pestania === 'crear' ? '/registro' : '/login';
    const payload =
      pestania === 'crear'
        ? { name: nombre, email, password, telefono: telefono || undefined }
        : { email, password };

    try {
      const respuesta = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': obtenerCsrf(),
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        const mensaje = datos.errors
          ? Object.values(datos.errors).flat()[0]
          : (datos.message ?? 'No se pudo completar la operación. Inténtalo nuevamente.');

        throw new Error(String(mensaje));
      }

      setGuardado(true);

      if (uuid) {
        router.post(
          '/autoevaluacion/vincular-cuenta',
          { uuid },
          {
            preserveScroll: true,
            onError: err => {
              setError(Object.values(err)[0] ?? 'No se pudo vincular tu autoevaluación.');
            },
          }
        );
      } else {
        router.reload({ only: ['auth'] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Guardar mi progreso"
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-100 text-left">

        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 rounded-xl text-[#7f1d1d] border border-rose-100">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Guardar mi progreso</h3>
              <span className="text-[10px] text-neutral-400 font-mono">
                Continuar después
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {guardado ? (
          /* -------- Estado de éxito -------- */
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-neutral-900">¡Tu cuenta está conectada!</h4>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {uuid
                  ? 'Tu autoevaluación ha sido guardada en tu cuenta exitosamente.'
                  : 'Sesión iniciada correctamente.'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left flex items-start gap-2 text-[11px] text-amber-950 leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-[#7f1d1d] shrink-0 mt-0.5" />
              <p>
                Tus observaciones y evidencias quedarán guardadas para que continúes cuando
                consigas los materiales o implementes las mejoras.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {uuid && (
                <a
                  href="/mis-autoevaluaciones"
                  className="w-full py-3 rounded-2xl bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  Ver mis autoevaluaciones
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pestañas */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setPestania('crear')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pestania === 'crear'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Crear Cuenta
              </button>
              <button
                type="button"
                onClick={() => setPestania('iniciar')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pestania === 'iniciar'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Ya tengo cuenta
              </button>
            </div>

            {establecimiento && (
              <p className="text-[11px] text-neutral-500 text-left">
                Guardarás el avance de <strong className="text-neutral-800">{establecimiento}</strong>.
                Si continúas como invitado, conserva tu enlace de seguimiento.
              </p>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[11px] text-[#7f1d1d] font-medium text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={manejarEnvio} className="space-y-3">
              {pestania === 'crear' && (
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                />
              )}

              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Correo electrónico"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
              />

              {pestania === 'crear' && (
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Teléfono (opcional)"
                  autoComplete="tel"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                />
              )}

              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete={pestania === 'crear' ? 'new-password' : 'current-password'}
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
              />

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 rounded-2xl bg-[#7f1d1d] hover:bg-[#991b1b] text-white text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : pestania === 'crear' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear cuenta y guardar progreso
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Iniciar sesión y guardar progreso
                  </>
                )}
              </button>
            </form>

            <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
              Al crear tu cuenta tus autoevaluaciones se conservan de forma segura y podrás
              retomarlas cuando desees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};