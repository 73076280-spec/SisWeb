import { cn } from '@/lib/utils';

export type EstadosChecklist = 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';
export type EstadosSubsanacion = 'PENDIENTE' | 'EN_PROCESO' | 'SUBSANADO_DECLARADO';

const TONOS: Record<string, string> = {
    CUMPLE: 'bg-success-100 text-success-800 border-success-200',
    NO_CUMPLE: 'bg-danger-100 text-danger-800 border-danger-200',
    POR_REVISAR: 'bg-warning-100 text-warning-800 border-warning-200',
    NA: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    PENDIENTE: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    EN_PROCESO: 'bg-warning-100 text-warning-800 border-warning-200',
    SUBSANADO_DECLARADO: 'bg-success-100 text-success-800 border-success-200',
};

const ETIQUETAS: Record<string, string> = {
    CUMPLE: 'Cumple',
    NO_CUMPLE: 'No cumple',
    POR_REVISAR: 'Por revisar',
    NA: 'No aplica',
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    SUBSANADO_DECLARADO: 'Declarado subsanado',
};

const TONO_FALLBACK = 'bg-neutral-100 text-neutral-600 border-neutral-200';

/**
 * Etiqueta humana de un estado de checklist o subsanación.
 *
 * Se exporta para que las vistas que no usan `EstadoBadge` (por ejemplo la matriz
 * de subsanaciones del informe legal) no dupliquen el mapa ni impriman el valor
 * crudo del enum, como `SUBSANADO_DECLARADO`, en un documento firmado.
 */
export function etiquetaEstado(estado: string): string {
    return ETIQUETAS[estado] ?? estado;
}

interface Props {
    estado: string;
    etiqueta?: string;
    className?: string;
}

export function EstadoBadge({ estado, etiqueta, className }: Props) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                TONOS[estado] ?? TONO_FALLBACK,
                className,
            )}
        >
            {etiqueta ?? (ETIQUETAS[estado] ?? estado)}
        </span>
    );
}