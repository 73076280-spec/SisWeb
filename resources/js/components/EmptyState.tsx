import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
    icono: LucideIcon;
    titulo: string;
    descripcion?: string;
    accion?: ReactNode;
    className?: string;
}

export function EmptyState({ icono: Icono, titulo, descripcion, accion, className }: Props) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-card border border-neutral-200/80 bg-white px-6 py-12 text-center',
                className,
            )}
        >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
                <Icono className="h-7 w-7 text-neutral-500" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">{titulo}</h3>
            {descripcion && <p className="mt-1 max-w-md text-sm text-neutral-500">{descripcion}</p>}
            {accion && <div className="mt-5">{accion}</div>}
        </div>
    );
}