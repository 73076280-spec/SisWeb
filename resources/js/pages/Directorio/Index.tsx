import React, { useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
  BadgeCheck,
  Building2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
  Wrench,
} from 'lucide-react';
import type { AliadoAsistenciaContrato } from '@/types/contrato';

interface FiltroOpcion {
  valor: string;
  etiqueta: string;
}

interface DirectorioProps {
  aliados: AliadoAsistenciaContrato[];
  filtros: {
    categoria: string | null;
    distrito: string | null;
  };
  categorias: FiltroOpcion[];
  distritos: FiltroOpcion[];
}

/**
 * Palabras que identifican a un profesional habilitado frente a un local
 * comercial. `DirectorioAliadosService` no modela la tipología en un campo
 * propio, así que se infiere del texto de especialidad que ya es parte del
 * catálogo canónico.
 */
const MARCAS_PROFESIONAL = [
  'ingenier',
  'electricista certificado',
  'especialista',
  'profesional',
  'arquitecto',
  'perito',
  'colegiado',
  'certificado en',
];

function esProfesional(aliado: AliadoAsistenciaContrato): boolean {
  const texto = `${aliado.especialidad_texto} ${aliado.contacto_nombre}`.toLowerCase();

  return MARCAS_PROFESIONAL.some((marca) => texto.includes(marca));
}

/** Rótulo corto de la especialidad, para el badge de categoría. */
const ETIQUETA_CATEGORIA: Record<string, string> = {
  electricas: 'Electricidad y Puesta a Tierra',
  incendios: 'Extintores y Señalética',
  arquitectura_senaletica: 'Planos y Evacuación',
  estructuras: 'Estructuras y Vidrios',
};

function mensajeWhatsapp(aliado: AliadoAsistenciaContrato): string {
  const especialidad = ETIQUETA_CATEGORIA[aliado.categoria] ?? 'servicios técnicos';
  const texto = `Hola ${aliado.nombre_comercial}, vi su contacto en CheckITSE Huancayo. Deseo consultar por ${especialidad} para mi local comercial.`;

  return `https://wa.me/${aliado.whatsapp}?text=${encodeURIComponent(texto)}`;
}

function telefonoEnlace(aliado: AliadoAsistenciaContrato): string {
  return `tel:+${aliado.telefono}`;
}

export default function Directorio({ aliados, filtros, categorias, distritos }: DirectorioProps) {
  const filtroCategoria = filtros.categoria ?? '';
  const filtroDistrito = filtros.distrito ?? '';

  const total = aliados.length;

  const resumenFiltros = useMemo(() => {
    const partes: string[] = [];
    const categoria = categorias.find((c) => c.valor === filtroCategoria);
    const distrito = distritos.find((d) => d.valor === filtroDistrito);

    if (categoria && categoria.valor) partes.push(categoria.etiqueta);
    if (distrito && distrito.valor) partes.push(distrito.etiqueta);

    return partes;
  }, [categorias, distritos, filtroCategoria, filtroDistrito]);

  const aplicarFiltro = (clave: 'categoria' | 'distrito', valor: string) => {
    router.get(
      '/directorio',
      { ...(clave === 'categoria' ? { categoria: valor } : { distrito: valor }) },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const limpiarFiltros = () => {
    router.get('/directorio', {}, { preserveState: true, preserveScroll: true, replace: true });
  };

  const hayFiltros = Boolean(filtroCategoria || filtroDistrito);

  return (
    <>
      <Head title="Directorio Técnico Huancayo - CheckITSE" />

      <div className="bg-slate-50">
        {/* Encabezado institucional */}
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              <Wrench className="h-3.5 w-3.5" />
              Directorio Cívico
            </span>
            <h1 className="mt-3 max-w-3xl text-2xl leading-tight font-black tracking-tight text-white sm:text-4xl">
              Red Técnica y Comercial de Huancayo — Subsanación y Cumplimiento ITSE
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Comercios técnicos y profesionales habilitados que atienden las observaciones de tu
              autoevaluación: recarga de extintores, protocolos de pozo a tierra, señalética y planos de evacuación.
              Contacta directamente; la plataforma no interviene en la contratación.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
                {total} {total === 1 ? 'prestador listado' : 'prestadores listados'}
              </span>
              {resumenFiltros.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                  Filtro: {resumenFiltros.join(' · ')}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {/* Barra de filtros */}
          <section
            aria-labelledby="filtros-directorio"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
          >
            <h2 id="filtros-directorio" className="sr-only">
              Filtros del directorio
            </h2>

            <fieldset>
              <legend className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                Especialidad
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {categorias.map((categoria) => {
                  const activo = filtroCategoria === categoria.valor;

                  return (
                    <button
                      key={`categoria-${categoria.valor || 'todas'}`}
                      type="button"
                      onClick={() => aplicarFiltro('categoria', categoria.valor)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        activo
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {categoria.etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mt-4 border-t border-slate-100 pt-4">
              <legend className="text-[11px] font-black tracking-wider text-slate-500 uppercase">
                Distrito
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {distritos.map((distrito) => {
                  const activo = filtroDistrito === distrito.valor;

                  return (
                    <button
                      key={`distrito-${distrito.valor || 'todos'}`}
                      type="button"
                      onClick={() => aplicarFiltro('distrito', distrito.valor)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1 ${
                        activo
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {distrito.etiqueta}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Limpiar filtros
              </button>
            )}
          </section>

          {/* Listado de prestadores */}
          {total === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Store className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Sin prestadores para esta combinación de filtros
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                Prueba con otra especialidad o con todos los distritos. El directorio se alimenta del catálogo
                comunitario de aliados; su cobertura es referencial.
              </p>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Ver directorio completo
              </button>
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {aliados.map((aliado) => {
                const profesional = esProfesional(aliado);
                const categoria = ETIQUETA_CATEGORIA[aliado.categoria] ?? 'Soporte técnico';

                return (
                  <li
                    key={aliado.id}
                    className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          profesional ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {profesional ? <UserRound className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm leading-snug font-bold text-slate-900">
                          {aliado.nombre_comercial}
                        </h2>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                          {aliado.contacto_nombre}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          profesional
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {profesional ? (
                          <UserRound className="h-3 w-3" />
                        ) : (
                          <Building2 className="h-3 w-3" />
                        )}
                        {profesional ? 'Ingeniero / Profesional Habilitado' : 'Tienda / Distribuidor Físico'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {categoria}
                      </span>
                    </div>

                    <p className="mt-3 text-[11px] leading-relaxed font-semibold text-slate-700">
                      {aliado.especialidad_texto}
                    </p>

                    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                      <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>
                        {aliado.sede}
                        {aliado.cobertura ? ` · Cobertura: ${aliado.cobertura}` : ''}
                      </span>
                    </p>

                    <ul className="mt-3 space-y-1.5">
                      {aliado.servicios.map((servicio) => (
                        <li
                          key={servicio}
                          className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
                          />
                          <span>{servicio}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                      <a
                        href={mensajeWhatsapp(aliado)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                      <a
                        href={telefonoEnlace(aliado)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                      >
                        <Phone className="h-4 w-4" />
                        Llamar
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Banner de deslinde cívico */}
          <aside
            role="note"
            aria-label="Deslinde sobre la naturaleza del directorio"
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  CheckITSE es una plataforma cívica de orientación técnica
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  No comercializa servicios, no cobra comisiones ni fija precios. La contratación y emisión de
                  comprobantes es estrictamente directa entre el comerciante y el prestador. La inclusión en este
                  directorio no constituye certificación, recomendación oficial ni vínculo con la Unidad de ITSE de la
                  Municipalidad Provincial de Huancayo.
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <Wrench className="h-4 w-4" />
                Volver a mi autoevaluación
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
