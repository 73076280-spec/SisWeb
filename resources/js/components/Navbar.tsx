import React, { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';

interface Usuario {
    id: number;
    name: string;
    email: string;
}

export const Navbar: React.FC = () => {
    const [mostrarModalAuth, setMostrarModalAuth] = useState(false);
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
        router.post('/logout');
    };

    const cerraMenu = () => {
        setMenuAbierto(false);
    };

    const esInicio = url === '/' || url.startsWith('/autoevaluacion');

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100">
            <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
                <Link
                    href="/"
                    onClick={cerraMenu}
                    className="flex items-center gap-2.5 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                    <div className="w-9 h-9 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-sm shadow-primary-900/20">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold tracking-tight text-neutral-900">CheckITSE</span>
                        <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                            Huancayo
                        </span>
                    </div>
                </Link>

                {/* Navegación de escritorio */}
                <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal">
                    <Link
                        href="/"
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            esInicio
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                        }`}
                    >
                        Inicio
                    </Link>
                    <a
                        href="/#como-funciona"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        Cómo funciona
                    </a>
                </nav>

                {usuario ? (
                    <div className="hidden md:flex items-center gap-2 sm:gap-3">
                        <Link
                            href="/mis-autoevaluaciones"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <UserRound className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Mis Autoevaluaciones</span>
                        </Link>

                        <span className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-neutral-600 max-w-[140px] truncate">
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
                            <span className="hidden sm:inline">Cerrar Sesión</span>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setMostrarModalAuth(true)}
                        className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        <UserRound className="w-3.5 h-3.5" />
                        Iniciar Sesión / Guardar Progreso
                    </button>
                )}

                {/* Botón de menú móvil */}
                <button
                    ref={menuButtonRef}
                    type="button"
                    onClick={() => setMenuAbierto(prev => !prev)}
                    aria-expanded={menuAbierto}
                    aria-controls="menu-movil"
                    aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
                    className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-neutral-700 border border-neutral-200 bg-white hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                >
                    {menuAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Menú móvil */}
            {menuAbierto && (
                <nav
                    id="menu-movil"
                    aria-label="Navegación móvil"
                    className="md:hidden border-t border-neutral-100 bg-white px-6 py-4 space-y-2"
                >
                    <Link
                        href="/"
                        onClick={cerraMenu}
                        className={`block px-3.5 py-2.5 rounded-xl text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            esInicio
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                        }`}
                    >
                        Inicio
                    </Link>
                    <a
                        href="/#como-funciona"
                        onClick={cerraMenu}
                        className="block px-3.5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        Cómo funciona
                    </a>

                    {usuario ? (
                        <>
                            <div className="flex items-center gap-2 px-3.5 py-2">
                                <span className="w-7 h-7 shrink-0 rounded-full bg-primary-700 text-white text-[11px] font-bold flex items-center justify-center">
                                    {usuario.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700 truncate">{usuario.name}</span>
                            </div>
                            <Link
                                href="/mis-autoevaluaciones"
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
                        <button
                            type="button"
                            onClick={() => {
                                setMenuAbierto(false);
                                setMostrarModalAuth(true);
                            }}
                            className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <UserRound className="w-4 h-4" />
                            Iniciar Sesión / Guardar Progreso
                        </button>
                    )}
                </nav>
            )}

            <ModalGuardarProgreso
                isOpen={mostrarModalAuth}
                onClose={() => setMostrarModalAuth(false)}
                uuid={null}
            />
        </header>
    );
};
