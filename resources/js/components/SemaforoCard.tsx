import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NivelSemaforo } from '@/components/SemaforoBadge';

interface ConfiguracionSemaforo {
    icono: LucideIcon;
    titulo: string;
    fondo: string;
    borde: string;
    colorIcono: string;
}

const CONFIGURACIONES: Record<NivelSemaforo, ConfiguracionSemaforo> = {
    VERDE: {
        icono: CheckCircle2,
        titulo: 'Nivel de preparación alto',
        fondo: 'bg-success-50',
        borde: 'border-success-200',
        colorIcono: 'bg-success-600 text-white',
    },
    AMBAR: {
        icono: AlertTriangle,
        titulo: 'Nivel de preparación medio con observaciones',
        fondo: 'bg-warning-50',
        borde: 'border-warning-200',
        colorIcono: 'bg-warning-500 text-white',
    },
    ROJO: {
        icono: ShieldAlert,
        titulo: 'Nivel de preparación crítico',
        fondo: 'bg-danger-50',
        borde: 'border-danger-200',
        colorIcono: 'bg-danger-600 text-white',
    },
};

interface Props {
    semaforo: NivelSemaforo;
    porcentaje?: number;
    descripcion?: string;
    className?: string;
    extra?: ReactNode;
}

export function SemaforoCard({ semaforo, porcentaje, descripcion, className, extra }: Props) {
    const configuracion = CONFIGURACIONES[semaforo];
    const Icono = configuracion.icono;

    return (
        <div
            className={cn(
                'flex flex-col gap-4 rounded-card border p-6 sm:flex-row sm:items-center',
                configuracion.fondo,
                configuracion.borde,
                className,
            )}
        >
            <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', configuracion.colorIcono)}>
                <Icono className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-neutral-900">{configuracion.titulo}</h2>
                {porcentaje !== undefined && (
                    <p className="mt-0.5 text-sm text-neutral-600">
                        Índice de preparación: <span className="font-bold text-neutral-900">{porcentaje}%</span>
                    </p>
                )}
                {descripcion && <p className="mt-1 text-sm text-neutral-600">{descripcion}</p>}
            </div>
            {extra && <div className="shrink-0">{extra}</div>}
        </div>
    );
}