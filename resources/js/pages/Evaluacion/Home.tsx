import React, { useRef, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { GuiaModal } from '@/components/GuiaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import {
  Sparkles,
  ArrowRight,
  Info,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  BellRing,
  Compass,
  Search,
  ListChecks,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Zap,
  Footprints,
  FlameKindling,
  Boxes,
  HelpCircle,
  Gauge,
  Clock,
  Building2,
  Calculator,
  Users,
  Ruler,
} from 'lucide-react';

interface HomeProps {
  catalogo?: unknown[];
}

type ModalidadTramite = 'EX_POST' | 'EX_ANTE';

interface EstimacionOrientativa {
  nivel: 'Bajo' | 'Medio' | 'Alto' | 'Muy Alto';
  modalidad: ModalidadTramite;
  titulo: string;
  factores: string[];
}

const GIROS_DISPONIBLES = [
  'Comercio',
  'Encuentro',
  'Hospedaje',
  'Salud',
  'Educacion',
  'Industrial',
  'Oficinas',
] as const;

const AREA_MAXIMA_EX_POST = 750;
const AFORO_MAXIMO_GIRO_ESPECIAL = 100;
const GIROS_ESPECIALES = ['Hospedaje', 'Salud'];

/**
 * Estimación orientativa y exclusivamente local para la landing pública.
 *
 * Reproduce los umbrales de clasificación de riesgo por función y escala física
 * descritos en el compendio normativo de `GuiaModal.tsx` (D.S. 002-2018-PCM y
 * R.J. 016-2018-CENEPRED/J). No consulta, replica ni sustituye a
 * `ItseRiskService::clasificarTramite()`, no persiste datos y no constituye una
 * evaluación: el diagnóstico real se obtiene en el flujo de autoevaluación.
 */
function estimarRiesgoOrientativo(giro: string, area: number | null, aforo: number | null): EstimacionOrientativa {
  const factores: string[] = [];

  const excedeArea = area !== null && area > AREA_MAXIMA_EX_POST;
  if (excedeArea) {
    factores.push(`Área techada de ${area} m², superior al máximo de ${AREA_MAXIMA_EX_POST} m²`);
  }

  const esGiroEspecial = GIROS_ESPECIALES.includes(giro);
  const excedeAforoEspecial = esGiroEspecial && aforo !== null && aforo > AFORO_MAXIMO_GIRO_ESPECIAL;
  if (excedeAforoEspecial) {
    factores.push(`Aforo de ${aforo} personas en giro de ${giro.toLowerCase()}, sobre el límite de ${AFORO_MAXIMO_GIRO_ESPECIAL}`);
  }

  const excedeEscalaFisica = excedeArea || excedeAforoEspecial;

  if (excedeEscalaFisica) {
    return {
      nivel: excedeArea && excedeAforoEspecial ? 'Muy Alto' : 'Alto',
      modalidad: 'EX_ANTE',
      titulo: 'ITSE Previa (Ex-Ante)',
      factores: factores.length > 0 ? factores : ['Escala física fuera del rango de Ex-Post'],
    };
  }

  const nivelEscala = area !== null && area > 300 ? 'Medio' : 'Bajo';

  return {
    nivel: nivelEscala,
    modalidad: 'EX_POST',
    titulo: 'ITSE Posterior (Ex-Post)',
    factores:
      factores.length > 0
        ? factores
        : [`Área techada dentro del rango de hasta ${AREA_MAXIMA_EX_POST} m² y giro sin factores agravantes`],
  };
}

const SEMAFORO_CONFIG: Record<string, { fondo: string; texto: string; borde: string }> = {
  Bajo: { fondo: 'bg-emerald-50', texto: 'text-emerald-900', borde: 'border-emerald-200' },
  Medio: { fondo: 'bg-amber-50', texto: 'text-amber-900', borde: 'border-amber-200' },
  Alto: { fondo: 'bg-rose-50', texto: 'text-rose-900', borde: 'border-rose-200' },
  'Muy Alto': { fondo: 'bg-rose-100', texto: 'text-rose-950', borde: 'border-rose-300' },
};

const PASOS = [
  {
    icono: Search,
    titulo: 'Pre-screening preventivo',
    descripcion:
      'Ingresa los datos generales de tu establecimiento en Huancayo y declara sus condiciones físicas: giro, área, pisos, aforo y uso de gas, frituras o escaleras.',
  },
  {
    icono: ListChecks,
    titulo: 'Simulacro guiado',
    descripcion:
      'El motor normativo filtra las preguntas para mostrarte únicamente los criterios que corresponden a las condiciones reales de tu negocio.',
  },
  {
    icono: ClipboardCheck,
    titulo: 'Plan de acción',
    descripcion:
      'Recibe un balance de condiciones cumplidas y pendientes, con recursos educativos técnicos para orientar cada mejora antes de una revisión oficial.',
  },
];

const VALORES = [
  {
    icono: ShieldAlert,
    titulo: 'Evita multas y cierres',
    descripcion:
      'Detecta a tiempo las condiciones que suelen originar observaciones en una inspección y te permite corregirlas con anticipación.',
  },
  {
    icono: BellRing,
    titulo: 'Alertas de vencimiento',
    descripcion:
      'Mantén bajo control los mantenimientos y vencimientos normativos de tu local, como la carga de extintores o la señalética de seguridad.',
  },
  {
    icono: Compass,
    titulo: 'Guiado paso a paso para ciudadanos',
    descripcion:
      'Cada pregunta está redactada en lenguaje sencillo y conectada a la norma técnica que la sustenta, sin tecnicismos innecesarios.',
  },
];

const AREAS_NORMATIVAS = [
  {
    icono: Flame,
    tono: 'bg-rose-50 text-rose-700 border-rose-100',
    titulo: 'Protección contra Incendios',
    descripcion:
      'Extintores de polvo químico seco (PQS) y extintores especializados Clase K en locales con cocción o frituras, con carga vigente y libre acceso.',
    etiqueta: 'Extintores PQS y Clase K',
  },
  {
    icono: Footprints,
    tono: 'bg-amber-50 text-amber-700 border-amber-100',
    titulo: 'Evacuación y Señalización',
    descripcion:
      'Rutas y pasadizos despejados, puertas de escape con apertura fluida, señalética normalizada y luces de emergencia operativas.',
    etiqueta: 'Rutas despejadas y luces de emergencia',
  },
  {
    icono: Zap,
    tono: 'bg-sky-50 text-sky-700 border-sky-100',
    titulo: 'Instalaciones Eléctricas',
    descripcion:
      'Tableros con mandil protector, interruptores termomagnéticos dimensionados, protección diferencial y cableado canalizado.',
    etiqueta: 'Tableros, diferenciales y canalizaciones',
  },
  {
    icono: FlameKindling,
    tono: 'bg-orange-50 text-orange-700 border-orange-100',
    titulo: 'Instalaciones de Gas (GLP)',
    descripcion:
      'Balones en ambientes ventilados a nivel de piso, mangueras y reguladores normados, distancia de seguridad y cilindros en buen estado.',
    etiqueta: 'Aplica según declaración física',
  },
  {
    icono: Boxes,
    tono: 'bg-violet-50 text-violet-700 border-violet-100',
    titulo: 'Estructuras y Almacenamiento',
    descripcion:
      'Escaleras con pasamanos continuos y pasos antideslizantes, más anclaje antisísmico de estanterías altas y mobiliario con riesgo de vuelco.',
    etiqueta: 'Aplica según escaleras o estanterías declaradas',
  },
];

const PREGUNTAS_FRECUENTES = [
  {
    titulo: '¿Tiene algún costo utilizar esta plataforma?',
    respuesta:
      'Ninguno. CheckITSE es una iniciativa cívica de orientación técnica completamente gratuita para todos los comerciantes y emprendedores de Huancayo.',
  },
  {
    titulo: '¿Esta plataforma reporta mis respuestas a la municipalidad?',
    respuesta:
      'CheckITSE es una herramienta independiente y preventiva. No está conectada a sistemas municipales ni genera actas de fiscalización.',
  },
  {
    titulo: '¿Es obligatorio tener RUC para iniciar?',
    respuesta:
      'No. Puedes registrar el RUC de tu negocio si lo tienes a mano para identificar tu reporte, o continuar libremente sin RUC.',
  },
  {
    titulo: '¿Qué pasa si mi local no tiene escaleras ni gas?',
    respuesta:
      'El motor de aplicabilidad filtra automáticamente las preguntas que no corresponden a tu negocio. Solo responderás sobre las condiciones que realmente aplican.',
  },
];

export default function Home({ catalogo: _catalogo }: HomeProps) {
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [giro, setGiro] = useState<string>('Comercio');
  const [area, setArea] = useState<string>('');
  const [aforo, setAforo] = useState<string>('');
  const [estimacion, setEstimacion] = useState<EstimacionOrientativa | null>(null);
  const [errorEstimacion, setErrorEstimacion] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'ex_post' | 'ex_ante'>('ex_post');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const calcularRiesgo = (e: React.FormEvent) => {
    e.preventDefault();

    const areaNum = area.trim() === '' ? null : Number(area);
    const aforoNum = aforo.trim() === '' ? null : Number(aforo);

    if (areaNum !== null && (Number.isNaN(areaNum) || areaNum <= 0)) {
      setErrorEstimacion('El área debe ser un valor mayor a 0 metros cuadrados.');
      setEstimacion(null);
      return;
    }

    if (aforoNum !== null && (Number.isNaN(aforoNum) || aforoNum < 1)) {
      setErrorEstimacion('El aforo debe ser al menos 1 persona.');
      setEstimacion(null);
      return;
    }

    setErrorEstimacion(null);
    setEstimacion(estimarRiesgoOrientativo(giro, areaNum, aforoNum));
  };

  const manejarTeclaTabs = (e: React.KeyboardEvent, destino: 'ex_post' | 'ex_ante') => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') {
      return;
    }

    e.preventDefault();
    setTabActiva(destino);
    tabRefs.current[destino]?.focus();
  };

  return (
    <>
      <Head title="CheckITSE Huancayo - Simulador preventivo de Inspección Técnica de Seguridad" />
      <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
      <ModalGuardarProgreso isOpen={showAuth} onClose={() => setShowAuth(false)} uuid={null} />

      {/* ========================================================== */}
      {/* HERO                                                        */}
      {/* ========================================================== */}
      <section className="relative mb-8 rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 shadow-sm">
        <div
          className="pointer-events-none absolute -top-32 -right-24 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center px-5 py-12 sm:px-10 sm:py-16">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Preparación inteligente para tu negocio
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-extrabold tracking-tight text-white mt-5 leading-[1.1]">
              Obtén tu Licencia de Funcionamiento sin sorpresas ni clausuras
            </h1>

            <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-xl leading-relaxed">
              Simula tu inspección de Defensa Civil (ITSE), detecta riesgos eléctricos y estructurales antes de tiempo, y
              organiza tus documentos en un solo lugar
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-6 py-4 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Simular mi local gratis
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/15 px-6 py-4 rounded-2xl transition cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Iniciar sesión
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-5 max-w-md leading-relaxed">
              Puedes comenzar de forma anónima y sin registrarte. Herramienta cívica gratuita y orientativa.
            </p>
          </div>

          {/* Tarjeta de semáforo simulado */}
          <div className="relative">
            <div className="relative rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xl shadow-slate-950/25 ring-1 ring-white/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">Bodega El Mantaro</p>
                    <p className="text-[11px] text-slate-500">Simulación ilustrativa</p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
                  Ámbar
                </span>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeDasharray="72 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-slate-900">
                    72%
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cumplimiento estimado</p>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                    8 de 11 condiciones declaradas como cumplidas. Revisa los pendientes antes de tu inspección.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-2">
                <li className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 flex-1">Extintor PQS con carga vigente</span>
                  <span className="text-[10px] font-bold text-emerald-700">Cumple</span>
                </li>
                <li className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-900 flex-1">Ruta de evacuación obstruida</span>
                  <span className="text-[10px] font-bold text-amber-700">Revisar</span>
                </li>
                <li className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 flex-1">Tablero con mandil protector</span>
                  <span className="text-[10px] font-bold text-emerald-700">Cumple</span>
                </li>
              </ul>

              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                Resultado ilustrativo. El diagnóstico real se obtiene al completar tu autoevaluación.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* AVISO DE NATURALEZA CÍVICA Y DESLINDE LEGAL               */}
      {/* ========================================================== */}
      <section className="mb-8">
        <div className="rounded-3xl border border-info-200 bg-info-50 p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-info-100 text-info-800 border border-info-200 rounded-2xl shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-info-950">Aviso importante de alcance y naturaleza preventiva</h2>
                <span className="text-[11px] font-mono font-semibold bg-info-100/80 text-info-800 px-2 py-0.5 rounded-md">
                  R.J. 016-2018-CENEPRED / D.S. 002-2018-PCM
                </span>
              </div>
              <p className="text-sm text-info-900/80 mt-1.5 leading-relaxed max-w-3xl">
                Esta plataforma es un <strong>simulador cívico preventivo y orientativo</strong> para comerciantes y vecinos
                de Huancayo. Los resultados reflejan únicamente las condiciones declaradas por el ciudadano y{' '}
                <strong>no constituyen una inspección oficial</strong> ni reemplazan la inspección de un inspector técnico
                de seguridad en edificaciones (ITSE). CheckITSE no constituye aprobación, autorización ni certificación del
                establecimiento, ni emite licencias o certificados ITSE.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuia(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-info-800 hover:text-info-950 bg-white border border-info-200 px-3.5 py-2 rounded-xl transition shrink-0 self-end sm:self-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ver Base Legal</span>
          </button>
        </div>
      </section>

      {/* ========================================================== */}
      {/* CALCULADORA RÁPIDA ORIENTATIVA                            */}
      {/* ========================================================== */}
      <section className="mb-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl">
              <Calculator className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Estimación rápida</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
            Calculadora rápida de nivel de riesgo estimado
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
            Una orientación rápida basada en tu giro, área techada y aforo. No sustituye la autoevaluación completa.
          </p>

          <form onSubmit={calcularRiesgo} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="calc-giro" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  Giro del negocio
                </label>
                <select
                  id="calc-giro"
                  value={giro}
                  onChange={e => setGiro(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 cursor-pointer"
                >
                  {GIROS_DISPONIBLES.map(opcion => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="calc-area" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  Área techada (m²)
                </label>
                <input
                  id="calc-area"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="any"
                  placeholder="Ej. 120"
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="calc-aforo" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Aforo estimado
                </label>
                <input
                  id="calc-aforo"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  placeholder="Ej. 25"
                  value={aforo}
                  onChange={e => setAforo(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <Gauge className="w-4 h-4" />
              Calcular nivel de riesgo estimado
            </button>
          </form>

          {errorEstimacion && (
            <div
              role="alert"
              className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-800"
            >
              {errorEstimacion}
            </div>
          )}

          {estimacion && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                    SEMAFORO_CONFIG[estimacion.nivel].fondo
                  } ${SEMAFORO_CONFIG[estimacion.nivel].texto} ${SEMAFORO_CONFIG[estimacion.nivel].borde}`}
                >
                  Riesgo {estimacion.nivel}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {estimacion.titulo}
                </span>
              </div>

              <ul className="mt-3.5 space-y-1.5">
                {estimacion.factores.map(factor => (
                  <li key={factor} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 mt-2" />
                    {factor}
                  </li>
                ))}
              </ul>

              <p className="text-xs text-slate-500 mt-3.5 leading-relaxed">
                Estimación referencial basada en función y escala física. Los umbrales provienen del{' '}
                <strong className="font-semibold text-slate-700">Manual CENEPRED</strong> y la{' '}
                <strong className="font-semibold text-slate-700">R.J. 016-2018-CENEPRED/J</strong>; la clasificación
                definitiva la realiza la entidad municipal.
              </p>

              <Link
                href="/autoevaluacion/nueva"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
              >
                Continuar con el diagnóstico real
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================== */}
      {/* DE LA DUDA A LA ACCIÓN                                      */}
      {/* ========================================================== */}
      <section id="como-funciona" className="scroll-mt-24 mb-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full">
            Paso a paso
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-3">De la duda a la acción</h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Un recorrido guiado y transparente en tres etapas, sin tecnicismos innecesarios.
          </p>
        </div>

        <ol className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {PASOS.map((paso, indice) => {
            const Icono = paso.icono;
            return (
              <li
                key={paso.titulo}
                className="relative p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Icono className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-extrabold text-slate-300 font-mono">
                    {String(indice + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-4">{paso.titulo}</h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{paso.descripcion}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ========================================================== */}
      {/* SECCIÓN DE VALOR                                            */}
      {/* ========================================================== */}
      <section id="beneficios" className="scroll-mt-24 mb-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Beneficios ciudadanos</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            Una herramienta para prepararte y llevar un mejor control
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Sin reemplazar una inspección oficial, te permite revisar tu establecimiento y organizar tus mejoras con
            tranquilidad.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {VALORES.map(valor => {
            const Icono = valor.icono;
            return (
              <div
                key={valor.titulo}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col transition duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl w-fit">
                  <Icono className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-4">{valor.titulo}</h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{valor.descripcion}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================== */}
      {/* MINI-GUÍA INTERACTIVA (TABS)                                */}
      {/* ========================================================== */}
      <section id="normativa" className="scroll-mt-24 mb-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Cumplimiento normativo</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            ¿Ex-Post o Ex-Ante? Así se define tu trámite
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            La modalidad de la Inspección Técnica de Seguridad en Edificaciones depende de tu función y escala física.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div role="tablist" aria-label="Modalidad de la Inspección Técnica de Seguridad" className="flex flex-col sm:flex-row gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              ref={el => {
                tabRefs.current.ex_post = el;
              }}
              type="button"
              role="tab"
              id="tab-ex-post"
              aria-selected={tabActiva === 'ex_post'}
              aria-controls="panel-ex-post"
              tabIndex={tabActiva === 'ex_post' ? 0 : -1}
              onClick={() => setTabActiva('ex_post')}
              onKeyDown={e => manejarTeclaTabs(e, 'ex_ante')}
              className={`flex-1 text-left sm:text-center px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                tabActiva === 'ex_post'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riesgo Bajo / Medio · Ex-Post
            </button>
            <button
              ref={el => {
                tabRefs.current.ex_ante = el;
              }}
              type="button"
              role="tab"
              id="tab-ex-ante"
              aria-selected={tabActiva === 'ex_ante'}
              aria-controls="panel-ex-ante"
              tabIndex={tabActiva === 'ex_ante' ? 0 : -1}
              onClick={() => setTabActiva('ex_ante')}
              onKeyDown={e => manejarTeclaTabs(e, 'ex_post')}
              className={`flex-1 text-left sm:text-center px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                tabActiva === 'ex_ante'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riesgo Alto / Muy Alto · Ex-Ante
            </button>
          </div>

          {tabActiva === 'ex_post' && (
            <div
              role="tabpanel"
              id="panel-ex-post"
              aria-labelledby="tab-ex-post"
              tabIndex={0}
              className="mt-6 rounded-2xl bg-emerald-50/60 border border-emerald-200 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Riesgo Bajo / Medio
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-white border border-emerald-200 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  ITSE Posterior (Ex-Post)
                </span>
              </div>

              <h3 className="text-base font-extrabold text-emerald-950 mt-3.5">Tu licencia se tramita antes de la verificación</h3>
              <p className="text-sm text-emerald-900/90 mt-1.5 leading-relaxed max-w-3xl">
                Aplica a comercios con área techada de hasta 750 m² y hasta 3 pisos, sin factores agravantes. La Licencia de
                Funcionamiento se tramita previamente y la verificación técnica se realiza con posterioridad.
              </p>

              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Área techada igual o menor a 750 m².',
                  'Hasta 3 pisos de altura.',
                  'Sin factores agravantes (calderos, GLP, giros especiales).',
                  'Licencia tramita antes; la ITSE se verifica después.',
                ].map(item => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-2xl bg-white/70 border border-emerald-100 px-3 py-2.5 text-xs text-emerald-900 leading-relaxed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-emerald-900/70 mt-4 leading-relaxed">
                Los plazos concretos dependen de la entidad municipal y de la demanda de solicitudes vigente.
              </p>
            </div>
          )}

          {tabActiva === 'ex_ante' && (
            <div
              role="tabpanel"
              id="panel-ex-ante"
              aria-labelledby="tab-ex-ante"
              tabIndex={0}
              className="mt-6 rounded-2xl bg-rose-50/60 border border-rose-200 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-900 px-2.5 py-1 rounded-full">
                  Riesgo Alto / Muy Alto
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-900 bg-white border border-rose-200 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  ITSE Previa (Ex-Ante)
                </span>
              </div>

              <h3 className="text-base font-extrabold text-rose-950 mt-3.5">Necesitas inspección técnica favorable previa</h3>
              <p className="text-sm text-rose-950/90 mt-1.5 leading-relaxed max-w-3xl">
                Aplica cuando el área supera los 750 m², cuando hay más de 3 pisos, en giros especiales (hospedaje o salud
                con más de 100 personas), o cuando existen calderos o GLP por encima de 118.18 galones. Exige inspección
                técnica favorable previa a la licencia.
              </p>

              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Área techada superior a 750 m².',
                  'Más de 3 pisos de altura.',
                  'Giros de hospedaje o salud con aforo mayor a 100 personas.',
                  'Presencia de calderos o GLP por encima de 118.18 galones.',
                ].map(item => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-2xl bg-white/70 border border-rose-100 px-3 py-2.5 text-xs text-rose-950 leading-relaxed"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-[11px] text-rose-900/70 mt-4 leading-relaxed">
                Prepararte con tiempo en esta modalidad reduce la posibilidad de postergar el inicio de tus actividades.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Compendio normativo de referencia:{' '}
            <strong className="font-semibold text-slate-700">D.S. N° 002-2018-PCM</strong> y{' '}
            <strong className="font-semibold text-slate-700">R.J. N° 016-2018-CENEPRED/J</strong>. Esta clasificación es
            referencial; la Determinación oficial corresponde a la entidad municipal.
          </p>
        </div>
      </section>

      {/* ========================================================== */}
      {/* 5 ÁREAS NORMATIVAS                                          */}
      {/* ========================================================== */}
      <section className="mb-8">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Criterios técnicos normativos
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-2">
            5 áreas de seguridad evaluadas en tu local
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            El sistema evalúa criterios técnicos basados en el Manual de Ejecución de ITSE y el RNE, adaptados a lo que
            realmente tiene tu comercio:
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AREAS_NORMATIVAS.map(area => {
            const Icono = area.icono;
            return (
              <div
                key={area.titulo}
                className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between transition duration-200 hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className={`p-2.5 border rounded-2xl w-fit ${area.tono}`}>
                    <Icono className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-4">{area.titulo}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">{area.descripcion}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{area.etiqueta}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================== */}
      {/* PREGUNTAS FRECUENTES                                       */}
      {/* ========================================================== */}
      <section className="mb-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Dudas habituales</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Preguntas frecuentes sobre CheckITSE Huancayo
          </h2>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREGUNTAS_FRECUENTES.map(pregunta => (
              <div key={pregunta.titulo} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">{pregunta.titulo}</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">{pregunta.respuesta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* CTA FINAL                                                   */}
      {/* ========================================================== */}
      <section className="mb-8">
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 text-center relative overflow-hidden shadow-sm">
          <div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10 max-w-xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 px-3 py-1 rounded-full">
              Comienza hoy mismo
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
              ¿Listo para revisar la seguridad de tu local?
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Toma el control preventivo de tu establecimiento en Huancayo en solo unos minutos. Sin registros obligatorios
              ni tecnicismos confusos.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-8 py-4 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Simular mi local gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================== */}
      {/* FOOTER OSCURO INSTITUCIONAL                                 */}
      {/* ========================================================== */}
      <footer className="rounded-3xl bg-slate-950 text-slate-400 p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">CheckITSE</p>
                <p className="text-[11px] text-slate-500">Huancayo · Junín</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed mt-3">
              Herramienta cívica preventiva y orientativa para comerciantes y vecinos de Huancayo.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Marco normativo de referencia</p>
            <ul className="text-xs leading-relaxed mt-2.5 space-y-1.5">
              <li>
                <span className="text-slate-500">Manual CENEPRED</span> — Inspección Técnica de Seguridad en Edificaciones
                (ITSE)
              </li>
              <li>
                <span className="text-slate-500">R.J. N° 016-2018-CENEPRED/J</span>
              </li>
              <li>
                <span className="text-slate-500">D.S. N° 002-2018-PCM</span>
              </li>
              <li>
                <span className="text-slate-500">Reglamento Nacional de Edificaciones (RNE)</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Alcance del servicio</p>
            <p className="text-xs leading-relaxed mt-2.5">
              CheckITSE no constituye inspección oficial ni reemplaza la labor del inspector técnico de seguridad. No
              emite licencias, autorizaciones, certificaciones ni actas. Los resultados reflejan únicamente las
              condiciones declaradas por el ciudadano.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-600">Herramienta gratuita. Sin registros obligatorios.</p>
          <button
            type="button"
            onClick={() => setShowGuia(true)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-emerald-300 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Ver compendio normativo
          </button>
        </div>
      </footer>
    </>
  );
}
