import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NivelSemaforo = 'VERDE' | 'AMBAR' | 'ROJO';

interface ConfiguracionSemaforo {
    icono: LucideIcon;
    etiqueta: string;
    clases: string;
}

const CONFIGURACIONES: Record<NivelSemaforo, ConfiguracionSemaforo> = {
    VERDE: {
        icono: CheckCircle2,
        etiqueta: 'Nivel verde',
        clases: 'bg-success-100 text-success-800 border-success-200',
    },
    AMBAR: {
        icono: AlertTriangle,
        etiqueta: 'Nivel ámbar',
        clases: 'bg-warning-100 text-warning-800 border-warning-200',
    },
    ROJO: {
        icono: ShieldAlert,
        etiqueta: 'Nivel rojo',
        clases: 'bg-danger-100 text-danger-800 border-danger-200',
    },
};

interface Props {
    semaforo: NivelSemaforo;
    etiqueta?: string;
    className?: string;
}

export function SemaforoBadge({ semaforo, etiqueta, className }: Props) {
    const configuracion = CONFIGURACIONES[semaforo];
    const Icono = configuracion.icono;

    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold',
                configuracion.clases,
                className,
            )}
        >
            <Icono className="h-3 w-3" />
            {etiqueta ?? configuracion.etiqueta}
        </span>
    );
}