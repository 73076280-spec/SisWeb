import { Info, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Datos del establecimiento que el backend ya entrega en cada fila de
 * `MisAutoevaluaciones`. Solo se previsualizan: el anexo oficial lo emite la
 * Unidad de Inspección Técnica de Seguridad en Seguridad de la Municipalidad.
 */
export interface DatosAnexoCivico {
    nombre_comercio: string;
    funcion_economica: string;
    ruc?: string | null;
    direccion?: string | null;
    area_m2?: number | null;
    pisos?: number | null;
    aforo?: number | null;
    codigo_acceso?: string | null;
    uuid_trazabilidad: string;
    fecha: string;
}

export type AnexoCivicoId = 'ANEXO_1' | 'ANEXO_4' | 'ANEXO_9';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    anexo: AnexoCivicoId | null;
    establecimiento: DatosAnexoCivico | null;
}

interface BloqueAnexo {
    titulo: string;
    campos: { etiqueta: string; valor: string }[];
}

interface DefinicionAnexo {
    titulo: string;
    subtitulo: string;
    baseNormativa: string;
    destinatario: string;
    bloques: BloqueAnexo[];
    declaracion: string;
    firmas: string[];
}

/**
 * Estructura de referencia de los dos anexos que el comerciante necesita para
 * acercarse a mesa de partes. Es una guía de campos y no reproduce el formato
 * oficial: los modelos vigentes se descargan de la web municipal y son los
 * únicos con validez para el trámite.
 */
const ANEXOS: Record<AnexoCivicoId, DefinicionAnexo> = {
    ANEXO_4: {
        titulo: 'Anexo 4 — Declaración Jurada de Cumplimiento',
        subtitulo: 'Modalidad previa sugerida para locales de riesgo bajo o medio',
        baseNormativa: 'D.S. N° 002-2018-PCM',
        destinatario: 'Mesa de partes de la Municipalidad Provincial de Huancayo',
        bloques: [
            {
                titulo: '1. Datos del titular',
                campos: [
                    { etiqueta: 'Nombre comercial o razón social', valor: 'nombre_comercio' },
                    { etiqueta: 'RUC', valor: 'ruc' },
                    { etiqueta: 'Giro o actividad económica', valor: 'funcion_economica' },
                ],
            },
            {
                titulo: '2. Datos del establecimiento',
                campos: [
                    { etiqueta: 'Dirección', valor: 'direccion' },
                    { etiqueta: 'Área techada', valor: 'area_m2' },
                    { etiqueta: 'Número de pisos', valor: 'pisos' },
                    { etiqueta: 'Aforo declarado', valor: 'aforo' },
                ],
            },
            {
                titulo: '3. Trazabilidad de la autoevaluación',
                campos: [
                    { etiqueta: 'Código de acceso CheckITSE', valor: 'codigo_acceso' },
                    { etiqueta: 'UUID de trazabilidad', valor: 'uuid_trazabilidad' },
                    { etiqueta: 'Fecha del registro', valor: 'fecha' },
                ],
            },
        ],
        declaracion:
            'El titular declara bajo juramento que los datos consignados son exactos y que las condiciones de seguridad de seguridad de su establecimiento se encuentran verificadas por su propia declaración preventiva, de acuerdo al detalle que consta en el expediente digital.',
        firmas: ['Fecha y firma del titular del establecimiento', 'Nombre, firma y DNI del testigo'],
    },
    ANEXO_1: {
        titulo: 'Anexo 1 — Solicitud de Inspección Técnica de Seguridad en Seguridad',
        subtitulo: 'Modalidad previa sugerida para locales de riesgo alto o muy alto',
        baseNormativa: 'D.S. N° 002-2018-PCM · R.J. N° 016-2018-CENEPRED/J',
        destinatario: 'Unidad de Inspección Técnica de Seguridad en Seguridad (ITSE)',
        bloques: [
            {
                titulo: '1. Datos del solicitante',
                campos: [
                    { etiqueta: 'Nombre comercial o razón social', valor: 'nombre_comercio' },
                    { etiqueta: 'RUC', valor: 'ruc' },
                    { etiqueta: 'Giro o actividad económica', valor: 'funcion_economica' },
                ],
            },
            {
                titulo: '2. Datos del establecimiento',
                campos: [
                    { etiqueta: 'Dirección', valor: 'direccion' },
                    { etiqueta: 'Área techada', valor: 'area_m2' },
                    { etiqueta: 'Número de pisos', valor: 'pisos' },
                    { etiqueta: 'Aforo declarado', valor: 'aforo' },
                ],
            },
            {
                titulo: '3. Motivo de la solicitud',
                campos: [
                    { etiqueta: 'Licencia de Funcionamiento', valor: 'licencia_nueva' },
                    { etiqueta: 'Cambio de giro o ampliación', valor: 'cambio_giro' },
                    { etiqueta: 'Renovación del certificado ITSE', valor: 'renovacion_itse' },
                ],
            },
            {
                titulo: '4. Trazabilidad de la autoevaluación',
                campos: [
                    { etiqueta: 'Código de acceso CheckITSE', valor: 'codigo_acceso' },
                    { etiqueta: 'UUID de trazabilidad', valor: 'uuid_trazabilidad' },
                    { etiqueta: 'Fecha del registro', valor: 'fecha' },
                ],
            },
        ],
        declaracion:
            'El solicitante declara bajo juramento que la información consignada es exacta, y se somete a la inspección física que el Grupo de Inspectores ITSE determine, asumiendo las observaciones que se formulen.',
        firmas: ['Fecha y firma del solicitante', 'Visto de la Unidad de ITSE'],
    },
    ANEXO_9: {
        titulo: 'Anexo 9 — Acta de Diligencia de ITSE (Simulador Orientativo)',
        subtitulo: 'Simulación pedagógica conforme al Manual de Ejecución de ITSE',
        baseNormativa: 'D.S. N° 002-2018-PCM · R.J. N° 016-2018-CENEPRED/J',
        destinatario: 'Unidad de Inspección Técnica de Seguridad en Seguridad (ITSE)',
        bloques: [
            {
                titulo: 'I y III. Datos del establecimiento y expediente',
                campos: [
                    { etiqueta: 'Nombre comercial o razón social', valor: 'nombre_comercio' },
                    { etiqueta: 'RUC', valor: 'ruc' },
                    { etiqueta: 'Giro o actividad económica', valor: 'funcion_economica' },
                    { etiqueta: 'Dirección', valor: 'direccion' },
                    { etiqueta: 'Área techada', valor: 'area_m2' },
                    { etiqueta: 'Número de pisos', valor: 'pisos' },
                    { etiqueta: 'Aforo declarado', valor: 'aforo' },
                    { etiqueta: 'Código de acceso CheckITSE', valor: 'codigo_acceso' },
                    { etiqueta: 'UUID de trazabilidad', valor: 'uuid_trazabilidad' },
                    { etiqueta: 'Fecha del registro', valor: 'fecha' },
                ],
            },
            {
                titulo: 'IV. Estado de la diligencia',
                campos: [
                    { etiqueta: 'Desenlace propuesto (orientativo)', valor: 'estado_diligencia' },
                    { etiqueta: 'Modalidad de trámite sugerida', valor: 'modalidad_sugerida' },
                    { etiqueta: 'Plazo de subsanación (días hábiles)', valor: 'plazo_subsanacion' },
                ],
            },
            {
                titulo: 'V. Lista de cotejo de observaciones detectadas',
                campos: [
                    { etiqueta: 'Faltas subsanables (pendientes/por revisar)', valor: 'faltas_subsanables' },
                    { etiqueta: 'Código(s) del checklist vinculado', valor: 'codigos_checklist' },
                ],
            },
            {
                titulo: 'VI. Suspensión de diligencia y plazo',
                campos: [
                    { etiqueta: 'Tipo de acto', valor: 'tipo_acta' },
                    { etiqueta: 'Fecha/hora de diligencia (propuesta)', valor: 'fecha_hora_diligencia' },
                    { etiqueta: 'Medio de levantamiento de suspensión', valor: 'medio_levantamiento' },
                ],
            },
            {
                titulo: 'VII. Conformidad o Disconformidad del administrado',
                campos: [
                    { etiqueta: 'Firma Inspector ITSE (campo reservado)', valor: 'firma_inspector' },
                    { etiqueta: 'Conformidad/Disconformidad del administrado', valor: 'conformidad_administrado' },
                    { etiqueta: 'Observaciones del administrado', valor: 'obs_administrado' },
                ],
            },
        ],
        declaracion:
            'Documento de referencia pedagógica para simulación de inspección. El acta oficial es suscrita exclusivamente por inspectores acreditados de la Unidad de ITSE, conforme al D.S. N° 002-2018-PCM y R.J. N° 016-2018-CENEPRED/J.',
        firmas: [
            'Firma y sello del Inspector ITSE',
            'Firma del Administrado / Representante Legal',
            'Fecha y hora de suscripción del Acta',
        ],
    },
};

/** Valores de los campos que no provienen del expediente, sino de la estructura del anexo. */
const CAMPOS_ESTRUCTURA: Record<string, string> = {
    licencia_nueva: 'Marcar si corresponde a licencia de funcionamiento nueva',
    cambio_giro: 'Marcar si corresponde a cambio de giro o ampliación',
    renovacion_itse: 'Marcar si corresponde a renovación del certificado ITSE',
};

const SUFIJOS: Record<string, string> = {
    area_m2: ' m²',
};

function valorCampo(clave: string, datos: DatosAnexoCivico | null): string {
    if (datos && clave in datos) {
        const bruto = (datos as unknown as Record<string, unknown>)[clave];
        if (bruto === null || bruto === undefined || bruto === '') {
            return 'No declarado';
        }
        if (typeof bruto === 'number') {
            return `${bruto}${SUFIJOS[clave] ?? ''}`;
        }
        return String(bruto);
    }

    return CAMPOS_ESTRUCTURA[clave] ?? 'No declarado';
}

export const ModalAnexoCivico: React.FC<Props> = ({ isOpen, onClose, anexo, establecimiento }) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const manejarTeclado = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();

                return;
            }

            if (event.key !== 'Tab') return;

            const panel = panelRef.current;
            if (!panel) return;

            const enfocables = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));

            if (enfocables.length === 0) return;

            const primero = enfocables[0];
            const ultimo = enfocables[enfocables.length - 1];

            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        },
        [onClose],
    );

    useEffect(() => {
        if (!isOpen) return;

        const anteriormenteFocalizado = document.activeElement as HTMLElement | null;

        document.addEventListener('keydown', manejarTeclado);
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', manejarTeclado);
            document.body.style.overflow = '';
            anteriormenteFocalizado?.focus?.();
        };
    }, [isOpen, manejarTeclado]);

    if (!isOpen || !anexo) return null;

    const definicion = ANEXOS[anexo];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="anexo-civico-titulo"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                className="max-h-[85vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-slate-300 bg-white text-left shadow-lg"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4 bg-white px-5 pt-5 sm:px-6">
                    <div className="min-w-0">
                        <h2
                            id="anexo-civico-titulo"
                            className="text-sm leading-snug font-bold text-slate-900 sm:text-base"
                        >
                            {definicion.titulo}
                        </h2>
                        <p className="mt-1 text-[11px] text-slate-500">{definicion.subtitulo}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar la vista previa del anexo"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>

                {/* Sello de agua del borrador. Va sobre el papel, no en el
                    encabezado oscuro, para que se lea como el estado del
                    documento y no como parte de la identidad institucional. */}
                <div className="border-b border-slate-200 bg-slate-100/80 px-5 py-2 text-center sm:px-6">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        Borrador pre-llenado — Uso cívico orientativo
                    </span>
                </div>

                <div className="space-y-4 bg-white px-5 py-5 sm:px-6">
                    {/* Membrete del expediente: banda técnica superior */}
                    <div className="overflow-hidden rounded-xl border border-slate-300">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-900 px-3.5 py-2">
                            <span className="font-mono text-[10px] font-bold tracking-wider text-white uppercase">
                                Expediente Digital Preventivo
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">Hoja {anexo.replace('ANEXO_', '')}</span>
                        </div>
                        <div className="bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600">
                            <p>
                                <span className="font-semibold text-slate-800">Destino:</span> {definicion.destinatario}
                            </p>
                            <p className="mt-0.5">
                                <span className="font-semibold text-slate-800">Base normativa:</span>{' '}
                                {definicion.baseNormativa}
                            </p>
                        </div>
                    </div>

                    {definicion.bloques.map((bloque) => (
                        <section key={bloque.titulo}>
                            <h3 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                                {bloque.titulo}
                            </h3>
                            <dl className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-300">
                                {bloque.campos.map((campo) => (
                                    <div
                                        key={`${bloque.titulo}-${campo.etiqueta}`}
                                        className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                                    >
                                        <dt className="text-[11px] text-slate-500">{campo.etiqueta}</dt>
                                        <dd className="font-mono text-xs font-semibold break-all text-slate-900 sm:text-right">
                                            {valorCampo(campo.valor, establecimiento)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}

                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                        <h3 className="text-[10px] font-bold tracking-wider text-emerald-800 uppercase">Declaración jurada del titular</h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-emerald-950">{definicion.declaracion}</p>
                    </section>

                    {/* Firmas: renglones punteados como en hoja oficial */}
                    <section className="rounded-xl border border-slate-300 bg-slate-50/60 p-4">
                        <h3 className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                            Firmas requeridas
                        </h3>
                        <ul className="mt-3 space-y-4">
                            {definicion.firmas.map((firma) => (
                                <li key={firma}>
                                    <span
                                        aria-hidden="true"
                                        className="block h-px w-full border-b border-dashed border-slate-400"
                                    />
                                    <span className="mt-1.5 block text-[11px] text-slate-600">{firma}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <span>
                            Vista previa de referencia. El formato oficial vigente se descarga de la web municipal y es el único con validez para el
                            trámite; esta pantalla no genera un anexo firmado ni constituye una inspección.
                        </span>
                    </p>
                </div>

                <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] w-full cursor-pointer rounded-2xl bg-slate-900 py-3 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                        Entendido
                    </button>
                </footer>
            </div>
        </div>
    );
};
