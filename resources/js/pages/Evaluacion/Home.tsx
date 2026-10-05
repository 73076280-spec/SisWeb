import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Head, Link } from '@inertiajs/react';
import { GuiaModal } from '@/components/GuiaModal';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BookOpen,
  Boxes,
  Building2,
  Calculator,
  CircleCheck,
  CircleHelp,
  ClipboardCheck,
  Clock,
  Compass,
  FileCheck,
  Flame,
  FlameKindling,
  Footprints,
  Gauge,
  Info,
  Landmark,
  ListChecks,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';

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

/**
 * Cifras de confianza del hero. Describen la plataforma, no un expediente:
 * ninguna depende de datos capturados por el ciudadano. La referencia normativa
 * es la que el motor de clasificación aplica de verdad (ItseRiskService).
 */
const METRICAS_CONFIANZA: { valor: string; etiqueta: string }[] = [
  { valor: '100%', etiqueta: 'Cívico y Gratuito' },
  { valor: 'R.J. 016', etiqueta: 'Escala CENEPRED' },
  { valor: '3 min', etiqueta: 'Tiempo promedio' },
];

/**
 * Muestra ilustrativa de la consola de diagnóstico del hero. Los valores son de
 * un comercio ficticio y cada referencia normativa es la que el propio motor
 * aplica a ese criterio: no hay porcentaje de cumplimiento, porque el proyecto
 * no calcula puntuaciones oficiales ni semáforos en la portada.
 */
const PARAMETROS_CONSOLA: { icono: typeof Users; valor: string; referencia: string }[] = [
  { icono: Users, valor: '38 personas', referencia: 'RNE A.130 · Ruta de evacuación' },
  { icono: Flame, valor: '2 und. PQS 6 kg', referencia: 'NTP 350.043-1 · Dotación mínima' },
  { icono: Zap, valor: '18.4 Ω', referencia: '≤ 25 Ω · Conforme (CNE)' },
];

/** Resumen de las dos modalidades de trámite para la tarjeta de prospecto. */
const MODALIDADES_RESUMEN: { etiqueta: string; descripcion: string; tono: string; texto: string }[] = [
  {
    etiqueta: 'Ex-Post',
    descripcion: 'Hasta 750 m², 3 pisos y sin factores agravantes.',
    tono: 'border-emerald-100 bg-emerald-50',
    texto: 'text-emerald-800',
  },
  {
    etiqueta: 'Ex-Ante',
    descripcion: 'Escala física amplia, giros especiales, calderos o GLP.',
    tono: 'border-rose-100 bg-rose-50',
    texto: 'text-rose-800',
  },
];

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
    titulo: 'Guía preventiva de vigencias técnicas (Extintores y Pozo a Tierra)',
    descripcion:
      'Consulta las orientaciones sobre carga de extintores y medición del pozo a tierra para contrastarlas con tu local antes de una verificación oficial.',
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

export default function Home() {
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [giro, setGiro] = useState<string>('Comercio');
  const [area, setArea] = useState<string>('');
  const [aforo, setAforo] = useState<string>('');
  const [estimacion, setEstimacion] = useState<EstimacionOrientativa | null>(null);
  const [errorEstimacion, setErrorEstimacion] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<'ex_post' | 'ex_ante'>('ex_post');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const calcularRiesgo = (e: FormEvent) => {
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

  const manejarTeclaTabs = (e: KeyboardEvent, destino: 'ex_post' | 'ex_ante') => {
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

      {/* ============================================================ */}
      {/* HERO ASIMÉTRICO — columna de mensaje + consola de diagnóstico  */}
      {/* ============================================================ */}
      <section
        aria-labelledby="hero-titulo"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 py-16 sm:py-24"
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 items-center gap-14 px-6 sm:px-10 lg:grid-cols-2 lg:gap-16">
          {/* COLUMNA IZQUIERDA — promesa, acciones y métricas de confianza */}
          <div>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              Simulación Preventiva ITSE Huancayo 2026
            </span>

            <h1
              id="hero-titulo"
              className="text-4xl font-black tracking-tight leading-[1.15] text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Diagnóstico ITSE preciso para tu local,{' '}
              <span className="text-emerald-600">antes de la inspección.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Calcula tu aforo normado, dotación de extintores y determina tu modalidad municipal (Previa vs. Posterior)
              en minutos y sin intermediarios.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Simular mi local gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Ver cómo funciona
              </a>
            </div>

            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-500">
              Puedes comenzar de forma anónima y sin registrarte. Herramienta cívica gratuita y orientativa.
            </p>

            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200/70 pt-8">
              {METRICAS_CONFIANZA.map(metrica => (
                /* `flex-col-reverse` invierte el orden visual sin alterar el orden
                   del DOM: el lector de pantalla anuncia el rótulo y luego la cifra. */
                <div key={metrica.valor} className="flex flex-col-reverse">
                  <dt className="mt-1 text-[11px] font-medium tracking-wide text-slate-500 uppercase">{metrica.etiqueta}</dt>
                  <dd className="text-2xl font-black tracking-tight text-slate-900">{metrica.valor}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 max-w-md text-xs leading-relaxed text-slate-400">
              Cifras de muestra: ilustran el alcance de la herramienta y no son estadísticas del
              servicio. Tu resultado real se calcula con los datos que declares.
            </p>
          </div>

          {/* COLUMNA DERECHA — showcase de la consola con micro-cards flotantes */}
          <div className="relative">
            <div className="relative rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Consola de Diagnóstico</p>
                    <p className="text-[11px] text-slate-500">Simulación ilustrativa · Comercio</p>
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                  Diagnóstico tipo
                </span>
              </div>

              {/* Indicador de estado, sin porcentaje: el proyecto no publica puntuaciones oficiales. */}
              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Estado estimado</p>
                <p className="mt-1.5 text-base font-bold text-slate-900">Riesgo Bajo / Medio (ITSE Posterior)</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    <Clock className="h-3 w-3" />
                    Plazo sugerido: 3 días hábiles
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    <Landmark className="h-3 w-3" />
                    D.S. 002-2018-PCM
                  </span>
                </div>
              </div>

              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {PARAMETROS_CONSOLA.map((parametro) => {
                  const Icono = parametro.icono;
                  return (
                    <li key={parametro.valor} className="rounded-xl border border-slate-100 bg-white p-3">
                      <Icono className="h-4 w-4 text-emerald-600" />
                      <p className="mt-2 text-sm font-bold text-slate-900">{parametro.valor}</p>
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{parametro.referencia}</p>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
                Muestra ilustrativa de un comercio ficticio. No constituye inspección oficial; el diagnóstico real se
                obtiene al completar tu autoevaluación.
              </p>
            </div>

            {/* Micro-card flotante superior — estado del marco normativo vigente */}
            <div className="absolute -top-3 -right-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg sm:-right-5">
              <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              Normativa Huancayo 2026
            </div>

            {/* Micro-card flotante inferior — entregable generado */}
            <div className="absolute -bottom-4 -left-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg sm:-left-5">
              <FileCheck className="h-4 w-4 shrink-0 text-sky-600" />
              Borrador Anexo 4 y 9 listo
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* AVISO DE NATURALEZA CÍVICA Y DESLINDE LEGAL                 */}
      {/* ============================================================ */}
      <section className="mt-10">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-info-200 bg-info-50 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-info-200 bg-info-100 p-2.5 text-info-800">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-info-950">Aviso importante de alcance y naturaleza preventiva</h2>
                <span className="rounded-md bg-info-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-info-800">
                  R.J. 016-2018-CENEPRED / D.S. 002-2018-PCM
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-info-900/80">
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
            className="inline-flex shrink-0 items-center gap-1.5 self-end rounded-xl border border-info-200 bg-white px-3.5 py-2 text-xs font-bold text-info-800 transition hover:bg-info-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500 sm:self-center"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Ver Base Legal</span>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* BENTO GRID — ¿Cómo funciona?                                 */}
      {/* ============================================================ */}
      <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="mt-12 scroll-mt-24">
        <div className="max-w-2xl">
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-700 uppercase">
            Paso a paso
          </span>
          <h2 id="como-funciona-titulo" className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            ¿Cómo funciona?
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Un recorrido guiado y transparente en tres etapas, sin tecnicismos innecesarios.
          </p>
        </div>

        {/* Rejilla asimétrica: la capacidad de cálculo ocupa doble ancho. */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* TARJETA 1 — doble ancho: calculadora paramétrica real */}
          <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
                <Calculator className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Cálculo paramétrico</span>
            </div>

            <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">
              Cálculo Paramétrico en Tiempo Real
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              Tu giro comercial y el área techada determinan la modalidad de trámite y los criterios normativos que te
              corresponden. Introduce los datos y contrasta el resultado al instante.
            </p>

            <form onSubmit={calcularRiesgo} className="mt-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="calc-giro" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Compass className="h-3.5 w-3.5 text-slate-400" />
                    Giro del negocio
                  </label>
                  <select
                    id="calc-giro"
                    value={giro}
                    onChange={e => setGiro(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {GIROS_DISPONIBLES.map(opcion => (
                      <option key={opcion} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="calc-area" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Ruler className="h-3.5 w-3.5 text-slate-400" />
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="calc-aforo" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                <Gauge className="h-4 w-4" />
                Calcular nivel de riesgo estimado
              </button>
            </form>

            {errorEstimacion && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {errorEstimacion}
              </div>
            )}

            {estimacion && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase ${SEMAFORO_CONFIG[estimacion.nivel].fondo} ${SEMAFORO_CONFIG[estimacion.nivel].texto} ${SEMAFORO_CONFIG[estimacion.nivel].borde}`}
                  >
                    Riesgo {estimacion.nivel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    <Clock className="h-3 w-3" />
                    {estimacion.titulo}
                  </span>
                </div>

                <ul className="mt-3.5 space-y-1.5">
                  {estimacion.factores.map(factor => (
                    <li key={factor} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {factor}
                    </li>
                  ))}
                </ul>

                <p className="mt-3.5 text-xs leading-relaxed text-slate-500">
                  Estimación referencial basada en función y escala física. Los umbrales provienen del{' '}
                  <strong className="font-semibold text-slate-700">Manual CENEPRED</strong> y la{' '}
                  <strong className="font-semibold text-slate-700">R.J. 016-2018-CENEPRED/J</strong>; la clasificación
                  definitiva la realiza la entidad municipal.
                </p>

                <Link
                  href="/autoevaluacion/nueva"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Continuar con el diagnóstico real
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </article>

          {/* TARJETA 2 — pronóstico de trámite municipal */}
          <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <span className="w-fit rounded-xl border border-sky-100 bg-sky-50 p-2 text-sky-700">
              <Building2 className="h-4 w-4" />
            </span>

            <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Pronóstico de Trámite Municipal</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              El D.S. 002-2018-PCM define si tu inspección es previa o posterior según función y escala física.
            </p>

            <ul className="mt-4 space-y-2.5">
              {MODALIDADES_RESUMEN.map((modalidad) => (
                <li key={modalidad.etiqueta} className={`rounded-xl border px-3 py-2.5 ${modalidad.tono}`}>
                  <p className={`text-xs font-bold ${modalidad.texto}`}>{modalidad.etiqueta}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{modalidad.descripcion}</p>
                </li>
              ))}
            </ul>

            <a
              href="#normativa"
              className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Ver el detalle normativo
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>

          {/* TARJETA 3 — expediente digital */}
          <article className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <span className="w-fit rounded-xl border border-violet-100 bg-violet-50 p-2 text-violet-700">
              <FileCheck className="h-4 w-4" />
            </span>

            <h3 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">Expediente Digital</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Los Anexos 4 y 9 se prellenan con los datos que declaras, listos para imprimir y presentar en mesa de
              partes.
            </p>

            <Link
              href="/autoevaluacion/nueva"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-emerald-700 transition hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Generar mis borradores
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>

        {/* Stepper compacto: conserva el recorrido en tres etapas. */}
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {PASOS.map((paso, indice) => {
            const Icono = paso.icono;
            return (
              <li key={paso.titulo} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icono className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wider text-emerald-700">
                    Paso {String(indice + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-0.5 text-sm font-bold text-slate-900">{paso.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{paso.descripcion}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ============================================================ */}
      {/* SECCIÓN DE VALOR                                            */}
      {/* ============================================================ */}
      <section id="beneficios" aria-labelledby="beneficios-titulo" className="mt-12 scroll-mt-24">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700">Beneficios ciudadanos</span>
          <h2 id="beneficios-titulo" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Una herramienta para prepararte y llevar un mejor control
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Sin reemplazar una inspección oficial, te permite revisar tu establecimiento y organizar tus mejoras con
            tranquilidad.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {VALORES.map(valor => {
            const Icono = valor.icono;
            return (
              <article
                key={valor.titulo}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <span className="w-fit rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-emerald-700">
                  <Icono className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-bold text-slate-900">{valor.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{valor.descripcion}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* MINI-GUÍA INTERACTIVA (TABS)                                */}
      {/* ============================================================ */}
      <section id="normativa" aria-labelledby="normativa-titulo" className="mt-12 scroll-mt-24">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700">Cumplimiento normativo</span>
          <h2 id="normativa-titulo" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            ¿Ex-Post o Ex-Ante? Así se define tu trámite
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            La modalidad de la Inspección Técnica de Seguridad en Edificaciones depende de tu función y escala física.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div role="tablist" aria-label="Modalidad de la Inspección Técnica de Seguridad" className="flex flex-col gap-2 rounded-xl bg-slate-100 p-1.5 sm:flex-row">
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
              className={`flex-1 cursor-pointer rounded-lg px-4 py-3 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-center ${
                tabActiva === 'ex_post' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              className={`flex-1 cursor-pointer rounded-lg px-4 py-3 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-center ${
                tabActiva === 'ex_ante' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
              className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-emerald-800 uppercase">
                  Riesgo Bajo / Medio
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                  <Clock className="h-3 w-3" />
                  ITSE Posterior (Ex-Post)
                </span>
              </div>

              <h3 className="mt-3.5 text-base font-extrabold text-emerald-950">Tu licencia se tramita antes de la verificación</h3>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-emerald-900/90">
                Aplica a comercios con área techada de hasta 750 m² y hasta 3 pisos, sin factores agravantes. La Licencia de
                Funcionamiento se tramita previamente y la verificación técnica se realiza con posterioridad.
              </p>

              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  'Área techada igual o menor a 750 m².',
                  'Hasta 3 pisos de altura.',
                  'Sin factores agravantes (calderos, GLP, giros especiales).',
                  'Licencia tramita antes; la ITSE se verifica después.',
                ].map(item => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-emerald-900"
                  >
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] leading-relaxed text-emerald-900/70">
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
              className="mt-6 rounded-xl border border-rose-200 bg-rose-50/60 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-rose-900 uppercase">
                  Riesgo Alto / Muy Alto
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-900">
                  <AlertTriangle className="h-3 w-3" />
                  ITSE Previa (Ex-Ante)
                </span>
              </div>

              <h3 className="mt-3.5 text-base font-extrabold text-rose-950">Necesitas inspección técnica favorable previa</h3>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-rose-950/90">
                Aplica cuando el área supera los 750 m², cuando hay más de 3 pisos, en giros especiales (hospedaje o salud
                con más de 100 personas), o cuando existen calderos o GLP por encima de 118.18 galones. Exige inspección
                técnica favorable previa a la licencia.
              </p>

              <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  'Área techada superior a 750 m².',
                  'Más de 3 pisos de altura.',
                  'Giros de hospedaje o salud con aforo mayor a 100 personas.',
                  'Presencia de calderos o GLP por encima de 118.18 galones.',
                ].map(item => (
                  <li
                    key={item}
                    className="flex items-start gap-2 rounded-xl border border-rose-100 bg-white/70 px-3 py-2.5 text-xs leading-relaxed text-rose-950"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[11px] leading-relaxed text-rose-900/70">
                Prepararte con tiempo en esta modalidad reduce la posibilidad de postergar el inicio de tus actividades.
              </p>
            </div>
          )}

          <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
            Compendio normativo de referencia:{' '}
            <strong className="font-semibold text-slate-700">D.S. N° 002-2018-PCM</strong> y{' '}
            <strong className="font-semibold text-slate-700">R.J. N° 016-2018-CENEPRED/J</strong>. Esta clasificación es
            referencial; la determinación oficial corresponde a la entidad municipal.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5 ÁREAS NORMATIVAS                                          */}
      {/* ============================================================ */}
      <section aria-labelledby="areas-titulo" className="mt-12">
        <div className="max-w-2xl">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700">Criterios técnicos normativos</span>
          <h2 id="areas-titulo" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            5 áreas de seguridad evaluadas en tu local
          </h2>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            El sistema evalúa criterios técnicos basados en el Manual de Ejecución de ITSE y el RNE, adaptados a lo que
            realmente tiene tu comercio:
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {AREAS_NORMATIVAS.map(area => {
            const Icono = area.icono;
            return (
              <article
                key={area.titulo}
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div>
                  <span className={`w-fit rounded-xl border p-2.5 ${area.tono}`}>
                    <Icono className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{area.titulo}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{area.descripcion}</p>
                </div>
                <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
                  <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{area.etiqueta}</span>
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* PREGUNTAS FRECUENTES                                       */}
      {/* ============================================================ */}
      <section aria-labelledby="faq-titulo" className="mt-12">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-2 flex items-center gap-2">
            <CircleHelp className="h-5 w-5 text-emerald-600" />
            <span className="text-[11px] font-bold tracking-wider text-emerald-700">Dudas habituales</span>
          </div>
          <h2 id="faq-titulo" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Preguntas frecuentes sobre CheckITSE Huancayo
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {PREGUNTAS_FRECUENTES.map(pregunta => (
              <div key={pregunta.titulo} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">{pregunta.titulo}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:text-sm">{pregunta.respuesta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CTA FINAL                                                   */}
      {/* ============================================================ */}
      <section className="mt-12">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-8 text-center shadow-sm sm:p-12">
          <div
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative z-10 mx-auto max-w-xl">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
              Comienza hoy mismo
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              ¿Listo para revisar la seguridad de tu local?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Toma el control preventivo de tu establecimiento en Huancayo en solo unos minutos. Sin registros obligatorios
              ni tecnicismos confusos.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-emerald-400 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Simular mi local gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN PUENTE — derivación al directorio de proveedores.
          Las fichas de proveedores viven en /directorio; aquí solo se
          deriva el tráfico con un enlace único. */}
      <section aria-labelledby="puente-proveedores-titulo" className="mt-12">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center sm:p-8">
          <div>
            <h2 id="puente-proveedores-titulo" className="text-2xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              ¿Necesitas corregir algo? Proveedores locales de confianza
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Electricistas certificados, recarga de extintores y señalética de evacuación, todos de Huancayo y con
              respaldo.
            </p>
          </div>

          <Link
            href="/directorio"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold whitespace-nowrap text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Ver proveedores <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* El pie institucional (marca, marco normativo y alcance del servicio) lo
          renderiza `layouts/AppLayout.tsx` con `components/Footer.tsx`. Aquí solo
          queda el acceso al compendio normativo interactivo de la portada. */}
      <div className="mt-8 flex justify-start pb-2">
        <button
          type="button"
          onClick={() => setShowGuia(true)}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Ver compendio normativo
        </button>
      </div>
    </>
  );
}