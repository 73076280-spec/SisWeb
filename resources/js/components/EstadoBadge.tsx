import { cn } from '@/lib/utils';
import { configEstado, etiquetaEstado } from '@/data/estados';

export { etiquetaEstado };

export type { EstadoChecklist, EstadoSemaforo, EstadoSubsanacion } from '@/data/estados';

export type EstadosChecklist = 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';

export type EstadosSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

interface Props {
    estado: string;
    etiqueta?: string;
    className?: string;
}

/**
 * Badge de estado. El tono y la etiqueta provienen exclusivamente de
 * `@/data/estados`, de modo que no se duplican paletas en las vistas.
 */
export function EstadoBadge({ estado, etiqueta, className }: Props) {
    const config = configEstado(estado);

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                config.badgeClass,
                className,
            )}
        >
            {etiqueta ?? (config.label || estado)}
        </span>
    );
}
