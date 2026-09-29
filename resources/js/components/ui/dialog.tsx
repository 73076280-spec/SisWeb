import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Modal canónico del proyecto.
 *
 * `DialogContent` delega en Radix las garantías de accesibilidad y de bloqueo de
 * scroll, de modo que no deben reimplementarse en cada modal:
 *
 * - Portal a `document.body` (`DialogPortal`).
 * - Cierre con tecla Escape y con clic en el overlay (`DismissableLayer`).
 * - Bloqueo del scroll del `body` con `overflow: hidden` y restauración del valor
 *   original al cerrar, incluida la compensación del ancho de la barra de
 *   desplazamiento (`react-remove-scroll`).
 * - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y `aria-describedby`
 *   enlazados automáticamente a `DialogTitle` y `DialogDescription`.
 * - Trampa de foco: el foco entra en el diálogo, queda contenido mientras está
 *   abierto y regresa al elemento disparador al cerrar (`FocusScope`).
 *
 * Radix expone `role="dialog"` pero no `aria-modal`, así que se declara de forma
 * explícita. Radix también advierte en desarrollo si falta un `DialogTitle`.
 *
 * El cuerpo desplazable vive en `DialogBody`: la cabecera y el pie quedan fijos
 * (`shrink-0`) y sólo el contenido central se desplaza, con `max-h-[90dvh]` para
 * que el modal nunca desborde la pantalla en móviles.
 */

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            'fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            aria-modal="true"
            className={cn(
                'fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg duration-200',
                'max-h-[90dvh] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-neutral-500 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-danger-900 focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-neutral-100 data-[state=open]:text-neutral-900">
                <X className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('shrink-0 space-y-1.5 px-6 pt-6 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('shrink-0 flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Title ref={ref} className={cn('text-base font-bold leading-tight text-neutral-900', className)} {...props} />
    ),
);
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm text-neutral-500', className)} {...props} />);
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
    Dialog,
    DialogBody,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
};
