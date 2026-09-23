import React, { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';

interface Usuario {
  id: number;
  name: string;
  email: string;
}

export const Navbar: React.FC = () => {
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false);
  const props = usePage().props as { auth?: { user: Usuario | null } };
  const usuario = props.auth?.user ?? null;

  const cerrarSesion = () => {
    router.post('/logout');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-6 sm:px-12 py-3.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-[#7f1d1d] flex items-center justify-center text-white shadow-sm shadow-rose-950/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tracking-tight text-neutral-900">CheckITSE</span>
            <span className="text-xs font-semibold text-[#7f1d1d] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              Huancayo
            </span>
          </div>
        </Link>

        {usuario ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/mis-autoevaluaciones"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7f1d1d] hover:text-[#991b1b] bg-rose-50/60 hover:bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <UserRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mis Autoevaluaciones</span>
            </Link>

            <span className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-neutral-600 max-w-[140px] truncate">
              <span className="w-6 h-6 shrink-0 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                {usuario.name.charAt(0).toUpperCase()}
              </span>
              {usuario.name}
            </span>

            <button
              type="button"
              onClick={cerrarSesion}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarModalAuth(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#7f1d1d] hover:bg-[#991b1b] px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <UserRound className="w-3.5 h-3.5" />
            Iniciar Sesión / Registrarse
          </button>
        )}
      </div>

      <ModalGuardarProgreso
        isOpen={mostrarModalAuth}
        onClose={() => setMostrarModalAuth(false)}
        uuid={null}
      />
    </header>
  );
};