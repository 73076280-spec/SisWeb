import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Menu, ShieldCheck, Sparkles, Store, UserRound, X } from 'lucide-react';

interface Usuario {
    id: number;
    name: string;
    email: string;
}

/**
 * Anclas públicas de la portada. Dentro de `/` se usa un fragmento del mismo
 * documento para que el desplazamiento sea continuo y sin recarga completa;
 * desde cualquier otra página se mantiene el prefijo `/` para no romper la
 * navegación Inertia hacia la portada.
 */
const ANCLAS_PORTADA = [
    { id: 'como-funciona', etiqueta: 'Cómo funciona' },
    { id: 'beneficios', etiqueta: 'Beneficios' },
    { id: 'normativa', etiqueta: 'Normativa' },
] as const;

export const Navbar: React.FC = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const props = usePage().props as { auth?: { user: Usuario | null } };
    const url = usePage().url;
    const usuario = props.auth?.user ?? null;

    useEffect(() => {
        if (!menuAbierto) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenuAbierto(false);
                menuButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [menuAbierto]);

    const cerrarSesion = () => {
        router.post(route('logout'));
    };

    const cerraMenu = () => {
        setMenuAbierto(false);
    };

    const esInicio = url === '/' || url.startsWith('/autoevaluacion');
    const esPortada = url === '/';

    const hrefAncla = (id: string) => (esPortada ? `#${id}` : `/#${id}`);

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sm:gap-4">
                <Link
                    href={route('autoevaluacion.index')}
                    onClick={cerraMenu}
                    className="flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <div className="w-9 h-9 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-sm shadow-primary-900/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">CheckITSE</span>
                        <span className="hidden sm:inline-flex text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                            Huancayo
                        </span>
                    </div>
                </Link>

                {/* Navegación de escritorio */}
                <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
                    <Link
                        href={route('autoevaluacion.index')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            esInicio
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                        }`}
                    >
                        Inicio
                    </Link>
                    {ANCLAS_PORTADA.map(ancla => (
                        <a
                            key={ancla.id}
                            href={hrefAncla(ancla.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            {ancla.etiqueta}
                        </a>
                    ))}
                </nav>

                {usuario ? (
                    <div className="hidden lg:flex items-center gap-3">
                        <Link
                            href={route('directorio.index')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <Store className="w-3.5 h-3.5" />
                            Directorio Técnico
                        </Link>

                        <Link
                            href={route('mis-autoevaluaciones')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <UserRound className="w-3.5 h-3.5" />
                            Mis Autoevaluaciones
                        </Link>

                        <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 max-w-[140px] truncate">
                            <span className="w-6 h-6 shrink-0 rounded-full bg-primary-700 text-white text-[10px] font-bold flex items-center justify-center">
                                {usuario.name.charAt(0).toUpperCase()}
                            </span>
                            {usuario.name}
                        </span>

                        <button
                            type="button"
                            onClick={cerrarSesion}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50 px-3 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Cerrar Sesión
                        </button>
                    </div>
                ) : (
                    <div className="hidden lg:flex items-center gap-2">
                        <Link
                            href={route('login')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-neutral-700 transition hover:border-slate-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <UserRound className="w-3.5 h-3.5" />
                            Iniciar Sesión
                        </Link>
                        <Link
                            href={route('register')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-primary-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Crear Cuenta
                        </Link>
                    </div>
                )}

                {/* Acceso rápido a la acción principal en celular y tableta */}
                <Link
                    href={route('autoevaluacion.nueva')}
                    onClick={cerraMenu}
                    className="lg:hidden inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Empezar
                </Link>

                {/* Botón de menú colapsable */}
                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMenuAbierto(prev => !prev)}
                    aria-expanded={menuAbierto}
                    aria-controls="menu-movil"
                    aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
                    className="lg:hidden inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl text-neutral-700 border border-neutral-200 bg-white hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                >
                    {menuAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Menú colapsable de celular y tableta */}
            {menuAbierto && (
                <nav
                    id="menu-movil"
                    aria-label="Navegación móvil"
                    className="lg:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-md max-h-[calc(100vh-4rem)] overflow-y-auto px-4 sm:px-6 py-4 space-y-2"
                >
                    <Link
                        href={route('autoevaluacion.index')}
                        onClick={cerraMenu}
                        className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            esInicio
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                        }`}
                    >
                        Inicio
                    </Link>
                    {ANCLAS_PORTADA.map(ancla => (
                        <a
                            key={ancla.id}
                            href={hrefAncla(ancla.id)}
                            onClick={cerraMenu}
                            className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            {ancla.etiqueta}
                        </a>
                    ))}

                    <Link
                        href={route('directorio.index')}
                        onClick={cerraMenu}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-primary-700 hover:bg-primary-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        <Store className="w-4 h-4" />
                        Directorio Técnico
                    </Link>

                    <Link
                        href={route('autoevaluacion.nueva')}
                        onClick={cerraMenu}
                        className="mt-1 flex items-center justify-center gap-2 w-full px-3.5 py-3 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        <Sparkles className="w-4 h-4" />
                        Simular mi local gratis
                    </Link>

                    {usuario ? (
                        <>
                            <div className="flex items-center gap-2 px-3.5 py-2">
                                <span className="w-7 h-7 shrink-0 rounded-full bg-primary-700 text-white text-[11px] font-bold flex items-center justify-center">
                                    {usuario.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700 truncate">{usuario.name}</span>
                            </div>
                            <Link
                                href={route('mis-autoevaluaciones')}
                                onClick={cerraMenu}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-primary-700 hover:bg-primary-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <UserRound className="w-4 h-4" />
                                Mis Autoevaluaciones
                            </Link>
                            <button
                                type="button"
                                onClick={cerrarSesion}
                                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar Sesión
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                onClick={cerraMenu}
                                className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <UserRound className="w-4 h-4" />
                                Iniciar Sesión
                            </Link>
                            <Link
                                href={route('register')}
                                onClick={cerraMenu}
                                className="flex w-full items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <Sparkles className="w-4 h-4" />
                                Crear Cuenta
                            </Link>
                        </>
                    )}
                </nav>
            )}
        </header>
    );
};
