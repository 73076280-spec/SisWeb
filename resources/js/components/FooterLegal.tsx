import { cn } from '@/lib/utils';

interface Props {
    texto?: string;
    className?: string;
}

export function FooterLegal({ texto, className }: Props) {
    return (
        <footer className={cn('border-t border-neutral-200/80 px-4 py-6', className)}>
            <p className="text-center text-xs leading-relaxed text-neutral-500">
                {texto ??
                    'CheckITSE Huancayo · Plataforma cívica de autoevaluación para la preparación ITSE. La información declarada no constituye una inspección oficial.'}
            </p>
        </footer>
    );
}