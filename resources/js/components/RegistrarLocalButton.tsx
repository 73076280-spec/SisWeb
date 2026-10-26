import React from 'react';
import { Link } from '@inertiajs/react';

interface RegistrarLocalButtonProps {
    readonly variant?: 'compact' | 'large';
    readonly className?: string;
    readonly onClick?: () => void;
}

export const RegistrarLocalButton: React.FC<RegistrarLocalButtonProps> = ({
    variant = 'compact',
    className = '',
    onClick,
}) => {
    const estiloBase =
        'inline-flex items-center justify-center font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2';

    const estiloVariante =
        variant === 'large'
            ? 'px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm rounded-2xl'
            : 'px-3 py-2 text-xs rounded-xl shrink-0';

    return (
        <Link
            href={route('autoevaluacion.nueva')}
            onClick={onClick}
            className={`${estiloBase} ${estiloVariante} ${className}`.trim()}
        >
            + Registrar Nuevo Local
        </Link>
    );
};

export default RegistrarLocalButton;
