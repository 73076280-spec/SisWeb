import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  LogIn,
  Save,
  UserPlus,
  X,
} from 'lucide-react';

type Pestania = 'crear' | 'iniciar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uuid?: string | null;
  establecimiento?: string | null;
  destino?: 'checklist' | 'resumen' | null;
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
  destino = null,
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
        if (respuesta.status === 429) {
          setError('Has realizado demasiados intentos. Espera un momento y vuelve a intentarlo.');
        } else {
          const mensaje = datos.errors
            ? Object.values(datos.errors).flat()[0]
            : (datos.message ?? 'No pudimos completar la operación. Inténtalo nuevamente.');

          setError(String(mensaje));
        }
        setCargando(false);
        return;
      }

      if (uuid) {
        const payloadVincular: { uuid: string; destino?: string } = { uuid };
        if (destino) {
          payloadVincular.destino = destino;
        }

        router.post(
          '/autoevaluacion/vincular-cuenta',
          payloadVincular,
          {
            preserveScroll: true,
            onSuccess: () => {
              setGuardado(true);
              setCargando(false);
            },
            onError: err => {
              setCargando(false);
              setError(Object.values(err)[0] ?? 'No pudimos guardar tu autoevaluación. Inténtalo nuevamente.');
            },
          }
        );
      } else {
        router.reload({ only: ['auth'] });
        setGuardado(true);
        setCargando(false);
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'Failed to fetch'
          ? 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.'
          : 'Ocurrió un error inesperado. Inténtalo nuevamente.'
      );
      setCargando(false);
    }
  };

  const classeInput =
    'w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium placeholder:text-neutral-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-600/20 outline-none';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/50 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guardar-progreso-titulo"
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-100 text-left">

        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl border border-primary-100">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 id="guardar-progreso-titulo" className="text-base font-bold text-neutral-900">
                Guardar mi progreso
              </h3>
              <span className="text-xs text-neutral-500">
                {uuid ? 'Conserva tu avance y retómalo cuando quieras' : 'Crea o inicia tu cuenta'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {guardado ? (
          /* -------- Estado de éxito -------- */
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-success-50 border border-success-200 flex items-center justify-center text-success-600">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-neutral-900">
                {uuid ? 'Tu autoevaluación se guardó correctamente' : 'Sesión iniciada correctamente'}
              </h4>
              <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                {uuid
                  ? 'Ahora puedes continuar y consultar tu progreso cuando lo necesites desde "Mis autoevaluaciones".'
                  : 'Tus autoevaluaciones quedarán guardadas en tu cuenta.'}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href="/mis-autoevaluaciones"
                className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ver mis autoevaluaciones
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 text-sm font-semibold transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Aclaración: invitado vs cuenta */}
            <div className="rounded-2xl bg-info-50/70 border border-info-100 p-3.5 text-sm text-neutral-700 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-info-600 shrink-0 mt-0.5" />
              <p>
                {uuid
                  ? 'Puedes completar tu autoevaluación sin crear una cuenta. Si creas o inicias sesión, guardaremos este avance en tu cuenta y podrás retomarlo cuando quieras.'
                  : 'Puedes usar CheckITSE sin registrarte. Si creas o inicias sesión, tus autoevaluaciones quedarán guardadas en tu cuenta.'}
              </p>
            </div>

            {establecimiento && (
              <p className="text-xs text-neutral-500 text-left">
                Guardarás el avance de <strong className="text-neutral-800">{establecimiento}</strong>.
                Si continúas como invitado, conserva el enlace de seguimiento de esta autoevaluación.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 p-3 rounded-2xl bg-danger-50 border border-danger-200 text-sm text-danger-800 font-medium text-left"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Pestañas / Selector de Modo */}
            <div
              role="group"
              aria-label="Modo de autenticación para guardar avance"
              className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl"
            >
              <button
                type="button"
                aria-pressed={pestania === 'crear'}
                onClick={() => setPestania('crear')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  pestania === 'crear'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Crear cuenta
              </button>
              <button
                type="button"
                aria-pressed={pestania === 'iniciar'}
                onClick={() => setPestania('iniciar')}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  pestania === 'iniciar'
                    ? 'bg-white text-primary-700 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Ya tengo cuenta
              </button>
            </div>

            <form onSubmit={manejarEnvio} className="space-y-3">
              {pestania === 'crear' && (
                <div>
                  <label htmlFor="progreso-nombre" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Nombre y apellido
                  </label>
                  <input
                    id="progreso-nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. Ana Quispe"
                    autoComplete="name"
                    className={classeInput}
                  />
                </div>
              )}

              <div>
                <label htmlFor="progreso-email" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="progreso-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  className={classeInput}
                />
              </div>

              {pestania === 'crear' && (
                <div>
                  <label htmlFor="progreso-telefono" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    id="progreso-telefono"
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej. 987 654 321"
                    autoComplete="tel"
                    className={classeInput}
                  />
                </div>
              )}

              <div>
                <label htmlFor="progreso-password" className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  Contraseña
                </label>
                <input
                  id="progreso-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={pestania === 'crear' ? 'new-password' : 'current-password'}
                  className={classeInput}
                />
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {cargando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
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

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
              >
                {uuid ? 'Continuar como invitado' : 'Continuar sin cuenta'}
              </button>
            </div>

            <p className="text-xs text-neutral-400 text-center leading-relaxed">
              Al crear tu cuenta, tus autoevaluaciones se conservan de forma segura y podrás
              retomarlas cuando desees.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};