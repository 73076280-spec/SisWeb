import { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Flame,
  FolderCheck,
  Gauge,
  GitBranch,
  Info,
  MoveHorizontal,
  PlusCircle,
  Ruler,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  X,
} from 'lucide-react';
import type {
  AutoevaluacionItem,
  ClasificacionTramiteResumen,
  MisAutoevaluacionesProps,
} from '@/types/contrato';

export interface ProcesoPreventivo {
  id: number;
  nombre_comercio: string;
  funcion_economica: string;
  ruc?: string | null;
  direccion?: string | null;
  original: AutoevaluacionItem;
  reevaluaciones: AutoevaluacionItem[];
  ultimaEvaluacion: AutoevaluacionItem;
  tieneReevaluaciones: boolean;
  difPorcentaje: number;
  difCumple: number;
  difNoCumple: number;
  difPorRevisar: number;
  difNa: number;
}

const configSemaforo: Record<string, { label: string; corto: string; dot: string; badge: string; text: string; icon: typeof CheckCircle2 }> = {
  VERDE: {
    label: 'VERDE — Favorable Preventivo',
    corto: 'Favorable',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'text-emerald-800',
    icon: CheckCircle2,
  },
  AMBAR: {
    label: 'ÁMBAR — Aspectos por revisar',
    corto: 'Por revisar',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    text: 'text-amber-900',
    icon: AlertTriangle,
  },
  ROJO: {
    label: 'ROJO — Atención prioritaria',
    corto: 'Atención prioritaria',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'text-rose-800',
    icon: ShieldAlert,
  },
};

const configPorDefecto = {
  label: 'Autoevaluado',
  corto: 'Autoevaluado',
  dot: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-700 border-slate-200',
  text: 'text-slate-700',
  icon: ShieldCheck,
};

/**
 * Mantenimientos con periodicity fijada por norma. No dependen del resultado de
 * la autoevaluación: el rótulo «100%» se refiere a las condiciones declaradas, no
 * a la vigencia de estos certificados.
 */
const ALERTAS_MANTENIMIENTO: { titulo: string; texto: string; norma: string }[] = [
  {
    titulo: 'Extintores',
    texto: 'Recarga anual obligatoria. Verifica la tarjeta de control de cada unidad y la fecha de la última recarga.',
    norma: 'NTP 350.043-1',
  },
  {
    titulo: 'Pozo a Tierra',
    texto: 'Protocolo de medición anual de la resistencia del sistema de puesta a tierra.',
    norma: 'CNE-UNE 170.012 · Máx. 25 Ω',
  },
  {
    titulo: 'Certificado ITSE',
    texto: 'Vigencia de 2 años contados desde la emisión municipal. Renueva antes del vencimiento.',
    norma: 'D.S. 002-2018-PCM',
  },
];

interface SegmentoEstado {
  clave: string;
  etiqueta: string;
  valor: number;
  /** Clase de Tailwind para barras y leyenda. */
  barra: string;
  /** Color hexadecimal equivalente, porque `stroke` de SVG no acepta clases. */
  color: string;
  chip: string;
}

/**
 * Desglose por estado de las condiciones declaradas. El flujo nuevo reporta
 * conteos normativos (`conteos_normativos`) y el legado reporte el conteo
 * plano de la matriz (`conteo_condiciones`); ambos describen los mismos cuatro
 * estados y ninguno se calcula aquí: solo se leen y se normaliza la etiqueta.
 */
function segmentosEstado(item: AutoevaluacionItem, esFlujoNuevo: boolean): SegmentoEstado[] {
  if (esFlujoNuevo) {
    const c = item.conteos_normativos;
    return [
      { clave: 'cumple', etiqueta: 'Cumple declarado', valor: c?.cumple_declarado ?? 0, barra: 'bg-emerald-600', color: '#059669', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
      { clave: 'pendiente', etiqueta: 'Pendiente de atender', valor: c?.pendiente_atender ?? 0, barra: 'bg-rose-500', color: '#f43f5e', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
      { clave: 'revisar', etiqueta: 'Por revisar', valor: c?.por_revisar ?? 0, barra: 'bg-amber-500', color: '#f59e0b', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
      { clave: 'na', etiqueta: 'No aplica', valor: c?.no_aplica ?? 0, barra: 'bg-slate-300', color: '#cbd5e1', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
    ];
  }

  const c = item.conteo_condiciones;
  return [
    { clave: 'cumple', etiqueta: 'Cumple', valor: c?.cumple ?? 0, barra: 'bg-emerald-600', color: '#059669', chip: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { clave: 'pendiente', etiqueta: 'No cumple', valor: c?.no_cumple ?? 0, barra: 'bg-rose-500', color: '#f43f5e', chip: 'border-rose-200 bg-rose-50 text-rose-700' },
    { clave: 'revisar', etiqueta: 'Por revisar', valor: c?.por_revisar ?? 0, barra: 'bg-amber-500', color: '#f59e0b', chip: 'border-amber-200 bg-amber-50 text-amber-700' },
    { clave: 'na', etiqueta: 'No aplica', valor: c?.na ?? 0, barra: 'bg-slate-300', color: '#cbd5e1', chip: 'border-slate-200 bg-slate-50 text-slate-600' },
  ];
}

/** Cantidad de condiciones que el ciudadano todavía debe atender. */
function pendientesDetectados(item: AutoevaluacionItem, esFlujoNuevo: boolean): number {
  if (esFlujoNuevo) {
    return (item.conteos_normativos?.pendiente_atender ?? 0) + (item.conteos_normativos?.por_revisar ?? 0);
  }
  return (item.conteo_condiciones?.no_cumple ?? 0) + (item.conteo_condiciones?.por_revisar ?? 0);
}

/**
 * Porcentaje de cumplimiento declarado sobre la base realmente evaluable.
 *
 * El denominador es `cumplidas + pendientes + por revisar`. Cruzar un numerador
 * agregado con el denominador de un solo registro produce porcentajes imposibles
 * (por ejemplo 167%), y una base vacía produce `NaN` o `Infinity`. Por eso la
 * base vacía devuelve 0 y el resultado se acota con `Math.min`/`Math.max`:
 * un porcentaje de cumplimiento nunca puede salirse del rango 0-100.
 */
function porcentajeCumplimientoSeguro(cumplidas: number, pendientes: number, porRevisar: number): number {
  const totalEvaluables = cumplidas + pendientes + porRevisar;

  if (totalEvaluables <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((cumplidas / totalEvaluables) * 100)));
}

/**
 * Fusiona los segmentos de varios registros en uno solo por clave, de modo que
 * el radar y la tabla hablen del mismo alcance y el denominador del porcentaje
 * sea siempre la suma de los valores que se están dibujando.
 */
function agregarSegmentos(listas: SegmentoEstado[][]): SegmentoEstado[] {
  const porClave = new Map<string, SegmentoEstado>();

  for (const lista of listas) {
    for (const segmento of lista) {
      const acumulado = porClave.get(segmento.clave);
      porClave.set(segmento.clave, { ...segmento, valor: (acumulado?.valor ?? 0) + segmento.valor });
    }
  }

  return [...porClave.values()];
}

/**
 * Dona de proporciones con SVG nativo: `stroke-dasharray` sobre un círculo.
 * Se prefiere a una librería de charts porque el proyecto no tiene ninguna y el
 * dato son solo cuatro segmentos.
 *
 * Los segmentos excluyen `No aplica`: una condición no evaluada no debe ocupar
 * arco, porque no es un cumplimiento ni un incumplimiento. El hueco restante se
 * deja como pista gris para que el círculo siga leyéndose completo.
 */
function DonaProporciones({
  segmentos,
  total,
  centroValor,
  centroEtiqueta,
}: {
  segmentos: SegmentoEstado[];
  total: number;
  centroValor: string;
  centroEtiqueta: string;
}) {
  const RADIO = 52;
  const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

  const visibles = segmentos.filter(s => s.valor > 0);
  const acumulado = visibles.reduce((acc, s) => acc + s.valor, 0);

  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={centroEtiqueta}>
          <circle cx="60" cy="60" r={RADIO} fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100" />

          {total > 0 &&
            acumulado > 0 &&
            visibles.map(s => {
              const fraccion = s.valor / acumulado;
              const largo = fraccion * CIRCUNFERENCIA;
              const elemento = (
                <circle
                  key={s.clave}
                  cx="60"
                  cy="60"
                  r={RADIO}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="10"
                  strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += largo;
              return elemento;
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">{centroValor}</span>
          <span className="mt-0.5 max-w-[70px] text-center text-[9px] leading-tight font-bold tracking-wide text-slate-500 uppercase">
            {centroEtiqueta}
          </span>
        </div>
      </div>

      <ul className="mt-4 w-full space-y-2">
        {segmentos.map(s => (
          <li key={s.clave} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.barra}`} aria-hidden="true" />
              <span className="truncate text-slate-600">{s.etiqueta}</span>
            </span>
            <span className="font-black text-slate-900">{s.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Avatar de local para el listado. Deriva iniciales del nombre comercial. */
function inicialesComercio(nombre: string): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) return '—';
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();

  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

/**
 * Rótulos y colores de la modalidad de trámite, derivados del valor que envía
 * `clasificarModalidadTramite()`. `EX_ANTE` es Inspección Previa y `EX_POST` es
 * Posterior; el texto lo evita para no repetir el jargon interno en la interfaz.
 *
 * Cuando el backend no entrega clasificación se declara «Sin clasificar» en vez
 * de asumir una modalidad: el dato ausente no equivale a ninguna de las dos.
 */
function presentacionModalidad(clasificacion: ClasificacionTramiteResumen | null | undefined): {
  titulo: string;
  detalle: string;
  chip: string;
  punto: string;
  fuente: 'registro' | 'recalculado' | 'sin_dato';
} {
  if (clasificacion?.tipo_tramite === 'EX_ANTE') {
    return {
      titulo: 'ITSE Previa',
      detalle: 'Ex-Ante · antes de la diligencia',
      chip: 'border-amber-200 bg-amber-50 text-amber-800',
      punto: 'bg-amber-500',
      fuente: clasificacion.fuente,
    };
  }

  if (clasificacion?.tipo_tramite === 'EX_POST') {
    return {
      titulo: 'ITSE Posterior',
      detalle: 'Ex-Post · posterior a la diligencia',
      chip: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      punto: 'bg-emerald-500',
      fuente: clasificacion.fuente,
    };
  }

  return {
    titulo: 'Sin clasificar',
    detalle: 'Completar los datos del local para determinar la modalidad',
    chip: 'border-slate-200 bg-slate-50 text-slate-600',
    punto: 'bg-slate-400',
    fuente: 'sin_dato',
  };
}

/**
 * Barras de cumplimiento por especialidad. El porcentaje sale de los propios
 * conteos de `desglose_especialidades` (`cumplidas / total`) y no de un cálculo
 * paralelo: si la disciplina no trae desglose, se marca como no disponible en
 * lugar de asumir 0% o 100%.
 */
function specialtiesOrdenadas(item: AutoevaluacionItem): Array<{
  clave: keyof NonNullable<AutoevaluacionItem['desglose_especialidades']>;
  nombre: string;
  cumplidas: number;
  total: number;
  alertas: number;
  estado: 'en_orden' | 'pendiente';
  porcentaje: number | null;
}> {
  const desglose = item.desglose_especialidades;
  if (!desglose) return [];

  return (['incendios', 'electricas', 'arquitectura', 'estructuras'] as const).map(clave => {
    const disciplina = desglose[clave];
    const total = disciplina.total;

    return {
      clave,
      nombre: disciplina.nombre,
      cumplidas: disciplina.cumplidas,
      total,
      alertas: disciplina.alertas,
      estado: disciplina.estado,
      // `total === 0` no es 0%: la disciplina no tiene condiciones evaluadas.
      porcentaje: total > 0 ? Math.round((disciplina.cumplidas / total) * 100) : null,
    };
  });
}

/** Saludo según la hora local del navegador. Sin dependencias de fecha. */
function saludoPorHora(): string {
  const hora = new Date().getHours();

  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';

  return 'Buenas noches';
}

/** Fila de la tabla de locales: un establecimiento con su registro vigente. */
interface FilaLocal {
  proceso: ProcesoPreventivo;
  /** Porcentaje acotado a 0-100 sobre la base evaluable del registro vigente. */
  cumplimiento: number;
  condicionesEvaluables: number;
  pendientes: number;
  modalidad: string;
  modalidadChip: string;
  enCurso: boolean;
  esFlujoNuevo: boolean;
}

/**
 * Calcula la fila de un local a partir de su registro vigente (`ultimaEvaluacion`).
 *
 * El porcentaje se acota con `porcentajeCumplimientoSeguro`: si el local no tiene
 * condiciones evaluadas devuelve 0 y nunca un NaN ni un valor sobre 100.
 */
function filaLocal(proceso: ProcesoPreventivo): FilaLocal {
  const vigente = proceso.ultimaEvaluacion;
  const esFlujoNuevo = Boolean(proceso.original.es_flujo_nuevo);
  const conteos = vigente.conteos_normativos;

  const cumplidas = conteos?.cumple_declarado ?? vigente.conteo_condiciones?.cumple ?? 0;
  const pendientesAtender = conteos?.pendiente_atender ?? vigente.conteo_condiciones?.no_cumple ?? 0;
  const porRevisar = conteos?.por_revisar ?? vigente.conteo_condiciones?.por_revisar ?? 0;
  const modalidad = presentacionModalidad(vigente.clasificacion_tramite);

  return {
    proceso,
    cumplimiento: porcentajeCumplimientoSeguro(cumplidas, pendientesAtender, porRevisar),
    condicionesEvaluables: cumplidas + pendientesAtender + porRevisar,
    pendientes: pendientesDetectados(proceso.original, esFlujoNuevo),
    modalidad: modalidad.titulo,
    modalidadChip: modalidad.chip,
    enCurso: proceso.original.estado === 'INICIADA',
    esFlujoNuevo,
  };
}

export default function MisAutoevaluaciones({ autoevaluaciones }: MisAutoevaluacionesProps) {
  const [busqueda, setBusqueda] = useState('');

  /* `auth.user` llega por el middleware `HandleInertiaRequests`, no por prop: la
     página solo declara `autoevaluaciones` y ese contrato no se toca. */
  const page = usePage();
  const usuario = (page.props as { auth?: { user?: { name?: string } | null } }).auth?.user ?? null;
  const nombreUsuario = usuario?.name?.trim() || null;
  const primerNombre = nombreUsuario ? nombreUsuario.split(/\s+/)[0] : null;

  // Agrupación estructurada de autoevaluaciones en Procesos Preventivos
  const procesos = useMemo<ProcesoPreventivo[]>(() => {
    if (!autoevaluaciones || autoevaluaciones.length === 0) {
      return [];
    }

    const originales = autoevaluaciones.filter((item) => !item.evaluacion_origen_id);
    const reevaluaciones = autoevaluaciones.filter((item) => Boolean(item.evaluacion_origen_id));

    // Mapear cada evaluación original con sus reevaluaciones asociadas
    const grupos: ProcesoPreventivo[] = originales.map((original) => {
      // Reevaluaciones de este origen común (orden cronológico ascendente: B (#1), C (#2), etc.)
      const reevsDelOrigen = reevaluaciones
        .filter((r) => r.evaluacion_origen_id === original.id)
        .sort((a, b) => a.id - b.id);

      const tieneReev = reevsDelOrigen.length > 0;
      const ultima = tieneReev ? reevsDelOrigen[reevsDelOrigen.length - 1] : original;

      const origConteo = original.conteo_condiciones || { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 };
      const ultConteo = ultima.conteo_condiciones || { total: 0, cumple: 0, no_cumple: 0, por_revisar: 0, na: 0 };

      const difPorcentaje = Number((ultima.porcentaje_cumplimiento - original.porcentaje_cumplimiento).toFixed(1));
      const difCumple = ultConteo.cumple - origConteo.cumple;
      const difNoCumple = ultConteo.no_cumple - origConteo.no_cumple;
      const difPorRevisar = ultConteo.por_revisar - origConteo.por_revisar;
      const difNa = ultConteo.na - origConteo.na;

      return {
        id: original.id,
        nombre_comercio: original.nombre_comercio,
        funcion_economica: original.funcion_economica,
        ruc: original.ruc,
        direccion: original.direccion,
        original,
        reevaluaciones: reevsDelOrigen,
        ultimaEvaluacion: ultima,
        tieneReevaluaciones: tieneReev,
        difPorcentaje,
        difCumple,
        difNoCumple,
        difPorRevisar,
        difNa,
      };
    });

    // Casos borde: reevaluaciones huérfanas cuya evaluación original no figura en la cuenta
    const idsOriginales = new Set(originales.map((o) => o.id));
    const huerfanas = reevaluaciones.filter((r) => !idsOriginales.has(r.evaluacion_origen_id as number));

    const gruposHuerfanos: ProcesoPreventivo[] = huerfanas.map((huerfana) => ({
      id: huerfana.id,
      nombre_comercio: huerfana.nombre_comercio,
      funcion_economica: huerfana.funcion_economica,
      ruc: huerfana.ruc,
      direccion: huerfana.direccion,
      original: huerfana,
      reevaluaciones: [],
      ultimaEvaluacion: huerfana,
      tieneReevaluaciones: false,
      difPorcentaje: 0,
      difCumple: 0,
      difNoCumple: 0,
      difPorRevisar: 0,
      difNa: 0,
    }));

    return grupos.concat(gruposHuerfanos);
  }, [autoevaluaciones]);

  /* Filtro del buscador: se compara contra los mismos campos que el usuario ve
     en cada tarjeta (comercio, giro, RUC y código de acceso). Se normaliza sin
     acentos para que «panaderia» encuentre «Panadería». */
  const procesosFiltrados = useMemo<ProcesoPreventivo[]>(() => {
    const consulta = busqueda
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (consulta.length === 0) return procesos;

    return procesos.filter(proceso => {
      const campos = [
        proceso.nombre_comercio,
        proceso.funcion_economica,
        proceso.ruc ?? '',
        proceso.original.codigo_acceso ?? '',
      ];

      return campos.some(campo =>
        campo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(consulta),
      );
    });
  }, [busqueda, procesos]);

  /* El más reciente es el head de la lista porque el backend ya la devuelve con
     `latest('id')`; el UUID del reporte vive en `original` y se recalcula al
     cambiar el proceso, así que se toma el primero sin suposiciones extra. */
  const procesoReciente = procesos[0] ?? null;

  /* La identidad del local (nombre, giro, RUC) pertenece al original, pero todas
     las cifras del Bento describen una evaluación concreta: si el proceso tiene
     reevaluaciones, la que manda es la última, no la que originó el historial. */
  const evaluacionReciente = procesoReciente?.ultimaEvaluacion ?? null;

  const modalidadReciente = presentacionModalidad(evaluacionReciente?.clasificacion_tramite);
  const especialidadesRecientes = useMemo<ReturnType<typeof specialtiesOrdenadas>>(
    () => (evaluacionReciente ? specialtiesOrdenadas(evaluacionReciente) : []),
    [evaluacionReciente],
  );
  const electricas = especialidadesRecientes.find(e => e.clave === 'electricas');
  const incendios = especialidadesRecientes.find(e => e.clave === 'incendios');

  /* Una fila por local, sobre los procesos que ya pasaron el buscador: así la
     búsqueda del header sigue gobernando la tabla, el radar y el detalle, y cada
     fila abre el expediente completo del establecimiento en lugar de duplicarlo
     en una tarjeta aparte debajo de todo. */
  const filasLocales = useMemo<FilaLocal[]>(() => procesosFiltrados.map(filaLocal), [procesosFiltrados]);

  /* El conteo de la columna principal es el de la última evaluación del proceso,
     no el agregado de todos los locales: mezclar ambos scopes mostraría un
     porcentaje que no corresponde a ningún registro. */
  const conteoReciente = evaluacionReciente?.conteo_condiciones ?? {
    total: 0,
    cumple: 0,
    no_cumple: 0,
    por_revisar: 0,
    na: 0,
  };
  const semáforoReciente = configSemaforo[String(evaluacionReciente?.semaforo)] ?? configPorDefecto;

  /* El radar se construye sobre el mismo conjunto que la tabla (los procesos
     que pasan el buscador) y con un único alcance: los arcos, el total y el
     porcentaje del centro salen de la misma suma, de modo que el centro nunca
     pueda contradecir al dibujo ni exceder 100%. `No aplica` se excluye porque
     una condición no evaluada no es ni un cumplimiento ni un incumplimiento. */
  const segmentosRadar = useMemo<SegmentoEstado[]>(
    () =>
      agregarSegmentos(
        procesosFiltrados.map(proceso =>
          segmentosEstado(proceso.original, Boolean(proceso.original.es_flujo_nuevo)),
        ),
      ).filter(s => s.clave !== 'na'),
    [procesosFiltrados],
  );

  const totalRadar = segmentosRadar.reduce((acc, s) => acc + s.valor, 0);
  const pctRadar = porcentajeCumplimientoSeguro(
    segmentosRadar.find(s => s.clave === 'cumple')?.valor ?? 0,
    segmentosRadar.find(s => s.clave === 'pendiente')?.valor ?? 0,
    segmentosRadar.find(s => s.clave === 'revisar')?.valor ?? 0,
  );

  const uuidReciente = procesoReciente?.original.uuid_trazabilidad ?? '';

  return (
    <>
      <Head title="Mis Autoevaluaciones - CheckITSE Huancayo" />

      {/* ============================================================ */}
      {/* SAAS CONSOLE — Bento Grid analítico en Light Mode           */}
      {/* ============================================================ */}
      <div className="bg-slate-50/70 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Header & saludo con buscador integrado */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold tracking-wider text-emerald-700 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                Consola del comerciante
              </span>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {saludoPorHora()}
                {primerNombre ? `, ${primerNombre}` : ', Comerciante'}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-slate-600">
                Panel de control técnico y preventivo de tus locales en Huancayo.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative">
                <label htmlFor="busqueda-locales" className="sr-only">
                  Buscar local por nombre, giro, RUC o código de acceso
                </label>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="busqueda-locales"
                  type="search"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar local, giro o RUC..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-9 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none sm:w-64"
                />
                {busqueda.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />
                {nombreUsuario ? 'Sesión activa' : 'Sesión ciudadana'}
              </span>
            </div>
          </header>

          {/* Fila superior: Bento Grid de 3 columnas */}
          {procesoReciente ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {/* COLUMNA 1 — Métrica principal */}
              <section
                aria-labelledby="metric-principal"
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 p-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      <Store className="h-3.5 w-3.5" aria-hidden="true" />
                      Último local
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      <GitBranch className="h-3 w-3" aria-hidden="true" />
                      {procesoReciente.tieneReevaluaciones
                        ? `${procesoReciente.reevaluaciones.length + 1} registros`
                        : '1 registro'}
                    </span>
                  </div>

                  <h2 id="metric-principal" className="mt-3 text-lg font-black tracking-tight text-slate-900">
                    {procesoReciente.nombre_comercio}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {procesoReciente.funcion_economica}
                    {procesoReciente.ruc ? ` · RUC ${procesoReciente.ruc}` : ''}
                  </p>

                  {/* Semáforo global + cumplimiento de la última evaluación */}
                  <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                    <div>
                      <p className="text-4xl leading-none font-black tracking-tight text-slate-900">
                        {conteoReciente.total > 0 ? `${evaluacionReciente.porcentaje_cumplimiento}%` : '—'}
                      </p>
                      <p className="mt-1.5 text-[10px] font-bold tracking-wide text-slate-500 uppercase">
                        Cumplimiento declarado
                      </p>
                    </div>

                    <span
                      className={`mb-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${semáforoReciente.badge}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${semáforoReciente.dot}`} aria-hidden="true" />
                      {semáforoReciente.corto}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500">
                    {conteoReciente.total > 0
                      ? `${conteoReciente.cumple} de ${conteoReciente.total} condiciones del último registro.`
                      : 'El último registro aún no tiene condiciones evaluadas.'}
                  </p>

                  {conteoReciente.no_cumple + conteoReciente.por_revisar > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      {conteoReciente.no_cumple + conteoReciente.por_revisar} condición
                      {conteoReciente.no_cumple + conteoReciente.por_revisar > 1 ? 'es' : ''} por atender
                    </p>
                  )}
                </div>

                <div className="mt-6">
                  <Link
                    href={route('autoevaluacion.nueva')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden="true" />
                    Nueva Autoevaluación
                  </Link>

                  <p className="mt-2.5 text-center text-[10px] leading-relaxed text-slate-500">
                    Declara tus locales y prepara el informe. Herramienta cívica gratuita.
                  </p>
                </div>
              </section>

              {/* COLUMNA 2 — Grid 2x2 de parámetros normativos */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-1">
                {/* Card A: Modalidad ITSE oficial */}
                <section
                  aria-labelledby="card-modalidad"
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Modalidad ITSE
                  </p>
                  <h3 id="card-modalidad" className="mt-1 text-sm font-black text-slate-900">
                    {modalidadReciente.titulo}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">{modalidadReciente.detalle}</p>
                  <span
                    className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${modalidadReciente.chip}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${modalidadReciente.punto}`} aria-hidden="true" />
                    {modalidadReciente.fuente === 'registro' ? 'Según registro' : 'Recalculado'}
                  </span>
                </section>

                {/* Card B: Aforo declarado */}
                <section
                  aria-labelledby="card-aforo"
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 p-1.5 text-sky-600">
                    <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Aforo declarado
                  </p>
                  <h3 id="card-aforo" className="mt-1 text-sm font-black text-slate-900">
                    {evaluacionReciente?.aforo != null ? (
                      <>
                        {evaluacionReciente.aforo}
                        <span className="ml-1 text-[11px] font-bold text-slate-500">personas</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Sin dato</span>
                    )}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {evaluacionReciente?.area_m2 != null
                      ? `${evaluacionReciente.area_m2} m² de área declarada`
                      : 'Área sin declarar'}
                  </p>
                  <span className="mt-2.5 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    Dato del responsable, sin cálculo
                  </span>
                </section>

                {/* Card C: Instalaciones eléctricas */}
                <section
                  aria-labelledby="card-electricas"
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 p-1.5 text-amber-600">
                    <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Eléctricas
                  </p>
                  <h3 id="card-electricas" className="mt-1 text-sm font-black text-slate-900">
                    {electricas && electricas.total > 0 ? (
                      <>
                        {electricas.cumplidas}
                        <span className="ml-1 text-[11px] font-bold text-slate-500">
                          de {electricas.total} cumplidas
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Sin evaluar</span>
                    )}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Incluye puesta a tierra, tableros y diferenciales
                  </p>
                  <span
                    className={`mt-2.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                      electricas && electricas.estado === 'en_orden'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {electricas && electricas.estado === 'en_orden' ? 'Disciplina en orden' : 'Con observaciones'}
                  </span>
                </section>

                {/* Card D: Protección contra incendios */}
                <section
                  aria-labelledby="card-incendios"
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 p-1.5 text-rose-600">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Contra incendios
                  </p>
                  <h3 id="card-incendios" className="mt-1 text-sm font-black text-slate-900">
                    {incendios && incendios.total > 0 ? (
                      <>
                        {incendios.cumplidas}
                        <span className="ml-1 text-[11px] font-bold text-slate-500">
                          de {incendios.total} cumplidas
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-400">Sin evaluar</span>
                    )}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Señalización, evacuación y medios de respuesta
                  </p>
                  <span
                    className={`mt-2.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${
                      incendios && incendios.estado === 'en_orden'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {incendios && incendios.estado === 'en_orden' ? 'Disciplina en orden' : 'Con observaciones'}
                  </span>
                </section>
              </div>

              {/* COLUMNA 3 — Barras por especialidad técnica */}
              <section
                aria-labelledby="especialidades-titulo"
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-slate-50 p-1.5 text-slate-700">
                    <Gauge className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id="especialidades-titulo"
                      className="text-sm font-black tracking-tight text-slate-900"
                    >
                      Cumplimiento por especialidad
                    </h2>
                    <p className="text-[11px] text-slate-500">Condiciones declaradas por disciplina</p>
                  </div>
                </div>

                {especialidadesRecientes.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    <p className="text-xs leading-relaxed text-slate-500">
                      Este registro aún no tiene desglose por especialidad. Se genera al registrar la
                      evaluación con el motor normativo.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {especialidadesRecientes.map(esp => (
                      <li key={esp.clave}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-slate-700">
                            {esp.nombre}
                          </span>
                          <span className="shrink-0 text-xs font-black text-slate-900">
                            {esp.porcentaje !== null ? `${esp.porcentaje}%` : 'n/d'}
                          </span>
                        </div>

                        <div
                          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
                          role="img"
                          aria-label={`${esp.nombre}: ${esp.porcentaje !== null ? `${esp.porcentaje}% de ${esp.total} condiciones cumplidas` : 'sin condiciones evaluadas'}`}
                        >
                          <div
                            className={`h-full rounded-full ${
                              esp.porcentaje === null
                                ? 'bg-slate-200'
                                : esp.porcentaje >= 85
                                  ? 'bg-emerald-500'
                                  : esp.porcentaje >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                            }`}
                            style={{ width: `${esp.porcentaje ?? 0}%` }}
                          />
                        </div>

                        <p className="mt-1 text-[10px] text-slate-500">
                          {esp.porcentaje === null
                            ? 'Sin condiciones evaluadas'
                            : `${esp.cumplidas} de ${esp.total} · ${esp.alertas} pendiente${esp.alertas === 1 ? '' : 's'}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-5 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500">
                  El porcentaje refleja condiciones marcadas por el responsable del establecimiento,
                  no una verificación municipal.
                </p>
              </section>
            </div>
          ) : (
            /* Estado sin datos: mantiene la simetría del Bento sin inventar métricas. */
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <ClipboardList className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-900">
                Aún no tienes autoevaluaciones guardadas
              </h2>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
                Cuando completes una autoevaluación preventiva y guardes tu progreso en esta cuenta,
                aparecerá aquí con sus parámetros normativos y el desglose por especialidad.
              </p>
              <Link
                href={route('autoevaluacion.nueva')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-lime-500 focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:outline-none"
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                Comenzar mi autoevaluación preventiva
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}

          {/* Acciones secundarias */}
          {procesoReciente && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <Link
                href={route('autoevaluacion.resumen', { uuid: uuidReciente })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Descargar Anexos Prellenados
              </Link>

              <Link
                href={route('directorio.index')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Directorio de Aliados Locales
              </Link>
            </div>
          )}

          {/* Tabla de locales: lista principal de la página. Cada fila resume el
              registro vigente y despliega el expediente completo del local, que
              antes se renderizaba dos veces (lista de locales + tarjeta inferior). */}
          <section
            aria-labelledby="locales-titulo"
            className="mt-4 rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-slate-50 p-1.5 text-slate-700">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="locales-titulo" className="text-sm font-black tracking-tight text-slate-900">
                    Mis establecimientos
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {filasLocales.length} de {procesos.length} establecimiento
                    {procesos.length === 1 ? '' : 's'}
                    {busqueda.length > 0 ? ' coinciden con tu búsqueda' : ' en tu cuenta'}
                  </p>
                </div>
              </div>

              {busqueda.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Limpiar filtro
                </button>
              )}
            </div>

            {filasLocales.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Search className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-900">Sin coincidencias</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                  No hay establecimientos que coincidan con «{busqueda}». Prueba con el nombre del
                  comercio, el giro o el RUC.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] border-collapse text-left">
                  <caption className="sr-only">
                    Establecimientos declarados por el usuario con su estado, cumplimiento declarado,
                    modalidad de trámite y accesos directos a su expediente
                  </caption>
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black tracking-wider text-slate-500 uppercase">
                      <th scope="col" className="px-5 py-3">Establecimiento</th>
                      <th scope="col" className="px-3 py-3">Registros</th>
                      <th scope="col" className="px-3 py-3">Estado</th>
                      <th scope="col" className="px-3 py-3">Cumplimiento</th>
                      <th scope="col" className="px-3 py-3">Modalidad</th>
                      <th scope="col" className="px-5 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {filasLocales.map(fila => {
                      const { proceso } = fila;
                      const cfg = configSemaforo[String(proceso.original.semaforo)] ?? configPorDefecto;
                      const Icono = cfg.icon;

                      return (
                        <tr key={proceso.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white"
                                aria-hidden="true"
                              >
                                {inicialesComercio(proceso.nombre_comercio)}
                              </span>
                              <div className="min-w-0">
                                <Link
                                  href={route('autoevaluacion.resultado', { uuid: proceso.original.uuid_trazabilidad })}
                                  className="truncate text-xs font-bold text-slate-900 hover:text-emerald-700 hover:underline block"
                                >
                                  {proceso.nombre_comercio}
                                </Link>
                                <p className="truncate text-[11px] text-slate-500">
                                  {proceso.funcion_economica}
                                  {proceso.ruc ? ` · RUC ${proceso.ruc}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                              <GitBranch className="h-3 w-3 text-slate-400" aria-hidden="true" />
                              {proceso.tieneReevaluaciones
                                ? `1 + ${proceso.reevaluaciones.length}`
                                : '1 registro'}
                            </span>
                            <span className="mt-0.5 block text-[10px] whitespace-nowrap text-slate-500">
                              {proceso.ultimaEvaluacion.fecha_corta ?? proceso.ultimaEvaluacion.fecha}
                            </span>
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${fila.enCurso ? 'border-amber-300 bg-amber-50 text-amber-800' : cfg.badge}`}
                            >
                              {fila.enCurso ? (
                                <Clock className="h-3 w-3 text-amber-600" aria-hidden="true" />
                              ) : (
                                <Icono className="h-3 w-3" aria-hidden="true" />
                              )}
                              {fila.enCurso ? 'INICIADA' : cfg.corto}
                            </span>
                            {fila.pendientes > 0 && (
                              <span className="mt-1 block text-[10px] font-bold text-rose-700">
                                {fila.pendientes} pendiente{fila.pendientes === 1 ? '' : 's'}
                              </span>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            <p className="text-xs font-black text-slate-900">
                              {fila.condicionesEvaluables > 0 ? `${fila.cumplimiento}%` : '0%'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {fila.condicionesEvaluables > 0
                                ? `${fila.condicionesEvaluables} condiciones`
                                : 'Sin evaluar'}
                            </p>
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${fila.modalidadChip}`}
                            >
                              {fila.modalidad}
                            </span>
                          </td>

                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {fila.enCurso ? (
                                <Link
                                  href={route('autoevaluacion.checklist', { uuid: proceso.original.uuid_trazabilidad })}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                >
                                  <span>Continuar Checklist</span>
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Link>
                              ) : (
                                <Link
                                  href={route('autoevaluacion.informe', { uuid: proceso.original.uuid_trazabilidad })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                                >
                                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Ver Informe</span>
                                </Link>
                              )}

                              <Link
                                href={route('autoevaluacion.resultado', { uuid: proceso.original.uuid_trazabilidad })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
                              >
                                <FolderCheck className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                                <span>Ver Expediente</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {filasLocales.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] text-slate-500 lg:hidden">
              <MoveHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              Desliza la tabla horizontalmente para ver todas las columnas.
            </p>
          )}

          {/* Aviso preventivo */}
          <aside
            role="note"
            aria-label="Aviso preventivo sobre el historial de autoevaluaciones"
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-600 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <p>
                <strong className="font-bold text-slate-800">Aviso preventivo:</strong> Las evaluaciones
                mostradas corresponden a declaraciones realizadas por el responsable del establecimiento.
                El historial permite comparar registros de autoevaluación, pero no constituye una
                verificación oficial de las condiciones de seguridad ni reemplaza la ITSE.
              </p>
            </div>
          </aside>

          {/* Radar de cumplimiento y recordatorios normados: el detalle por local
              vive ahora en la tabla principal, asi que queda solo la lectura agregada. */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section
              aria-labelledby="radar-titulo"
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
                  <Gauge className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="radar-titulo" className="text-xs font-black tracking-wider text-slate-800 uppercase">
                    Radar de cumplimiento
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Condiciones declaradas por disciplina
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <DonaProporciones
                  segmentos={segmentosRadar}
                  total={totalRadar}
                  centroValor={`${pctRadar}%`}
                  centroEtiqueta="Cumple declarado"
                />
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-500">
                El porcentaje refleja condiciones marcadas por el responsable, no una verificación
                municipal. «No aplica» se excluye del cálculo porque no es un criterio evaluado.
              </p>
            </section>

            <section
              aria-labelledby="recordatorios-titulo"
              className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 sm:p-6"
            >
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <h2
                  id="recordatorios-titulo"
                  className="text-xs font-black tracking-wider text-amber-900 uppercase"
                >
                  Recordatorios normados
                </h2>
              </div>

              <ul className="mt-3 space-y-2">
                {ALERTAS_MANTENIMIENTO.map(alerta => (
                  <li key={alerta.titulo} className="rounded-xl border border-amber-200/70 bg-white p-3">
                    <div className="flex items-center gap-1.5">
                      <BellRing className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                      <span className="text-[11px] font-black tracking-wide text-amber-950 uppercase">
                        {alerta.titulo}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700">{alerta.texto}</p>
                    <span className="mt-2 inline-flex rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                      {alerta.norma}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-900/80">
                <Info className="mt-px h-3 w-3 shrink-0 text-amber-600" aria-hidden="true" />
                <span>
                  Calendario orientativo: estas obligaciones se cumplen con mantenimiento documentado
                  y vigente, aunque tu autoevaluación figure al 100% de preparación.
                </span>
              </p>

              {/* El directorio de especialistas vive en el Plan de Acción del veredicto,
                  donde cada observación abre «Ver solución» con los aliados que devolvió
                  el backend. */}
              <Link
                href={procesoReciente?.ultimaEvaluacion ? route('autoevaluacion.resumen', { uuid: procesoReciente.ultimaEvaluacion.uuid_trazabilidad }) : route('autoevaluacion.index')}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-[11px] font-bold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100/60 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                <span>Cotizar renovaciones con el directorio de especialistas</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
