import { AlertTriangle, Building2, Calendar, CheckCircle2, Clock, Hash, MapPin, ShieldAlert, ShieldCheck, Store } from 'lucide-react';
import { useMemo } from 'react';
import { CryptoSealBadge } from '@/components/shared/CryptoSealBadge';

export interface ResumenHeaderProps {
    readonly nombreComercio?: string;
    readonly uuidTrazabilidad?: string;
    readonly nivelRiesgo: string;
    readonly tipoTramite?: string;
    readonly estado?: string;
    readonly fechaEmision?: string;
    readonly codigoAcceso?: string;
    readonly funcionEconomica?: string;
    readonly direccion?: string;
    readonly ruc?: string;
    readonly esApto?: boolean;
    readonly hashIntegridad?: string | null;
    readonly esRegistrada?: boolean;
}

/**
 * Subcomponente presentacional que renderiza la cabecera visual del diagnóstico técnico:
 * título, folio / código de acceso, fecha de emisión, metadata del establecimiento y veredicto.
 */
export function ResumenHeader({
    nombreComercio = 'Local Comercial',
    uuidTrazabilidad,
    nivelRiesgo,
    tipoTramite,
    estado,
    fechaEmision,
    codigoAcceso,
    funcionEconomica = 'Comercio General',
    direccion,
    ruc,
    esApto = false,
    hashIntegridad,
    esRegistrada = true,
}: Readonly<ResumenHeaderProps>) {
    const esRiesgoAlto = useMemo(() => {
        const nr = (nivelRiesgo || '').toUpperCase();
        if (nr.includes('ALTO') || nr === 'MUY_ALTO' || nr === 'ALTO_MUY_ALTO') return true;
        if (tipoTramite === 'EX_ANTE') return true;
        return !esApto;
    }, [nivelRiesgo, tipoTramite, esApto]);

    const estadoTexto = estado ?? (esApto ? 'APTO PARA ITSE' : 'REQUIERE SUBSANACIÓN');

    return (
        <section
            aria-label="Diagnóstico técnico preventivo y nivel de riesgo"
            className={`rounded-3xl border-2 p-6 shadow-xs transition-all sm:p-8 print:border-slate-300 print:bg-white print:p-4 ${
                esRiesgoAlto
                    ? 'border-rose-200/90 bg-gradient-to-br from-rose-50/80 via-white to-red-50/40 text-rose-950'
                    : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 text-emerald-950'
            }`}
        >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black tracking-wider uppercase shadow-2xs ${
                                esRiesgoAlto
                                    ? 'border-rose-300 bg-rose-100/80 text-rose-800'
                                    : 'border-emerald-300 bg-emerald-100/80 text-emerald-800'
                            }`}
                        >
                            {esRiesgoAlto ? (
                                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                            ) : (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            DIAGNÓSTICO TÉCNICO PREVENTIVO — MUNICIPALIDAD DE HUANCAYO
                        </span>

                        {(codigoAcceso || uuidTrazabilidad) && (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-2xs select-all"
                                title={uuidTrazabilidad ? `UUID: ${uuidTrazabilidad}` : undefined}
                            >
                                <Hash className="h-3 w-3 text-slate-400" />
                                {codigoAcceso || (uuidTrazabilidad ? uuidTrazabilidad.substring(0, 8) : '')}
                            </span>
                        )}

                        {tipoTramite && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-2xs">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {tipoTramite === 'EX_ANTE' ? 'ITSE Previa (Ex-Ante)' : 'ITSE Posterior (Ex-Post)'}
                            </span>
                        )}

                        {fechaEmision && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                <span>{fechaEmision}</span>
                            </span>
                        )}
                    </div>

                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                            Nivel de Riesgo Estimado:{' '}
                            <span
                                className={
                                    esRiesgoAlto ? 'text-rose-600 underline decoration-rose-300 decoration-wavy decoration-2' : 'text-emerald-700'
                                }
                            >
                                {nivelRiesgo}
                            </span>
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed font-bold text-slate-800 sm:text-base">
                            {esRiesgoAlto
                                ? 'Tu establecimiento presenta observaciones críticas que impedirían la obtención de la ITSE en una inspección real. Revisa el plan de subsanación priorizado abajo.'
                                : 'Tu establecimiento presenta un nivel de seguridad adecuado para tramitar tu Licencia de Funcionamiento con inspección posterior.'}
                        </p>
                    </div>

                    {/* Metadata limpia en pastillas sutiles */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-900 shadow-2xs">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            {nombreComercio}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold shadow-2xs">
                            <Store className="h-3.5 w-3.5 text-slate-500" />
                            {funcionEconomica}
                        </span>
                        {direccion && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
                                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                <span className="max-w-[220px] truncate">{direccion}</span>
                            </span>
                        )}
                        {ruc && (
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono shadow-2xs">
                                <span className="text-slate-400">RUC:</span> {ruc}
                            </span>
                        )}
                    </div>

                    {/* Sello Criptográfico SHA-256 e Integridad */}
                    {hashIntegridad && (
                        <div className="pt-1">
                            <CryptoSealBadge
                                hash={hashIntegridad}
                                fecha={fechaEmision}
                                esInmutable={esRegistrada}
                            />
                        </div>
                    )}
                </div>

                {/* Badge lateral de veredicto rápido */}
                <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 text-center shadow-xs sm:w-48 sm:flex-col sm:justify-center sm:p-5">
                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${
                            esRiesgoAlto ? 'bg-rose-500' : 'bg-emerald-600'
                        }`}
                    >
                        {esRiesgoAlto ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                    </div>
                    <div className="text-left sm:text-center">
                        <span className="block text-[10px] font-black tracking-wider text-slate-500 uppercase">Estado Veredicto</span>
                        <span className={`text-sm font-black sm:text-base ${esRiesgoAlto ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {estadoTexto}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default ResumenHeader;
