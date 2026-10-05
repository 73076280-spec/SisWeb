import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Footprints,
  Layers,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { DesgloseEspecialidades } from '@/types/contrato';

export interface CriterioResumenItem {
  codigo: string;
  titulo: string;
  es_critico?: boolean;
  que_observar?: string;
  norma_base?: string | null;
}

export interface DiagnosticoMultidimensionalProps {
  /** Desglose por 4 disciplinas proveniente del backend (si existe) */
  desglose?: DesgloseEspecialidades | null;
  /** Criterios con observaciones (pendientes de atender) */
  pendientes?: CriterioResumenItem[];
  /** Criterios marcados por verificar */
  porRevisar?: CriterioResumenItem[];
  /** Criterios declarados conformes */
  cumple?: CriterioResumenItem[];
  /** Clasificación del trámite */
  clasificacion?: {
    tipo_tramite?: string;
    nivel_riesgo?: string;
    es_previa?: boolean;
    motivos?: string[];
  } | null;
  /** Nombre del comercio */
  nombreComercio?: string;
  className?: string;
}

/**
 * Clasifica un código o texto en uno de los 2 ejes canónicos de CENEPRED (Anexo 17).
 */
export function clasificarEnEjeCenepred(codigo: string, titulo: string = ''): 'incendio_electrico' | 'evacuacion_estructural' {
  const cod = codigo.toUpperCase();
  const text = titulo.toLowerCase();

  if (
    cod.startsWith('CRIT-01') || // Extintor PQS
    cod.startsWith('CRIT-02A') || // Extintor K
    cod.startsWith('CRIT-05') || // Pozo a tierra
    cod.startsWith('CRIT-06') || // Tablero y diferencial
    cod.startsWith('CRIT-07') || // Cables canalizados / mellizos
    cod.startsWith('CRIT-08') || // Luces de emergencia (circuito eléctrico)
    cod.startsWith('CRIT-10') || // GLP
    cod.startsWith('CRIT-14') || // Mandil / espacio libre tablero
    cod.includes('EXTINTOR') ||
    cod.includes('DIFERENCIAL') ||
    cod.includes('TERMOMAGNETICO') ||
    cod.includes('TABLERO') ||
    cod.includes('CABLEADO') ||
    cod.includes('TIERRA') ||
    cod.includes('GLP') ||
    cod.includes('CAMPANA') ||
    cod.includes('DETECTOR') ||
    text.includes('extintor') ||
    text.includes('pozo a tierra') ||
    text.includes('puesta a tierra') ||
    text.includes('tablero') ||
    text.includes('diferencial') ||
    text.includes('cable') ||
    text.includes('gas') ||
    text.includes('glp') ||
    text.includes('calder') ||
    text.includes('eléctr')
  ) {
    return 'incendio_electrico';
  }

  return 'evacuacion_estructural';
}

export function DiagnosticoMultidimensional({
  desglose,
  pendientes = [],
  porRevisar = [],
  cumple = [],
  clasificacion,
  nombreComercio,
  className = '',
}: DiagnosticoMultidimensionalProps) {
  // 1. Cálculo de métricas para Eje 1 (Incendio y Seguridad Eléctrica)
  let total1 = 0;
  let cumplidas1 = 0;
  let alertas1 = 0;

  // 2. Cálculo de métricas para Eje 2 (Evacuación y Seguridad Estructural)
  let total2 = 0;
  let cumplidas2 = 0;
  let alertas2 = 0;

  if (desglose) {
    // Si viene el desglose estructurado del backend (eléctricas + incendios vs arquitectura + estructuras)
    const elec = desglose.electricas ?? { total: 0, cumplidas: 0, alertas: 0 };
    const inc = desglose.incendios ?? { total: 0, cumplidas: 0, alertas: 0 };
    const arq = desglose.arquitectura ?? { total: 0, cumplidas: 0, alertas: 0 };
    const est = desglose.estructuras ?? { total: 0, cumplidas: 0, alertas: 0 };

    total1 = elec.total + inc.total;
    cumplidas1 = elec.cumplidas + inc.cumplidas;
    alertas1 = elec.alertas + inc.alertas;

    total2 = arq.total + est.total;
    cumplidas2 = arq.cumplidas + est.cumplidas;
    alertas2 = arq.alertas + est.alertas;
  } else {
    // Modo de derivación directa por listas de criterios
    cumple.forEach((it) => {
      const eje = clasificarEnEjeCenepred(it.codigo, it.titulo);
      if (eje === 'incendio_electrico') {
        cumplidas1++;
        total1++;
      } else {
        cumplidas2++;
        total2++;
      }
    });

    [...pendientes, ...porRevisar].forEach((it) => {
      const eje = clasificarEnEjeCenepred(it.codigo, it.titulo);
      if (eje === 'incendio_electrico') {
        alertas1++;
        total1++;
      } else {
        alertas2++;
        total2++;
      }
    });
  }

  // Porcentajes de conformidad protegidos
  const pct1 = total1 > 0 ? Math.min(100, Math.max(0, Math.round((cumplidas1 / total1) * 100))) : 100;
  const pct2 = total2 > 0 ? Math.min(100, Math.max(0, Math.round((cumplidas2 / total2) * 100))) : 100;

  const esPrevia = Boolean(clasificacion?.es_previa || clasificacion?.tipo_tramite === 'EX_ANTE');

  const esEje1Conforme = alertas1 === 0;
  const esEje2Conforme = alertas2 === 0;

  // Tiempo estimado de resolución técnica
  let diasEstimadosResolucion = '0 días (Cumplimiento inmediato)';
  const totalAlertas = alertas1 + alertas2;
  if (totalAlertas > 0) {
    if (alertas1 > 0 && alertas2 > 0) {
      diasEstimadosResolucion = '3 a 5 días hábiles (Intervención técnica integral)';
    } else if (alertas1 > 0) {
      diasEstimadosResolucion = '2 a 4 días hábiles (Adecuación eléctrica y extintores)';
    } else {
      diasEstimadosResolucion = '1 a 3 días hábiles (Despeje y señalética de rutas)';
    }
  }

  // Análisis del Principio de Prevalencia
  let diagnosticoPrevalencia = '';
  let estiloPrevalencia = 'border-emerald-200 bg-emerald-50/80 text-emerald-950';

  if (esEje1Conforme && esEje2Conforme) {
    diagnosticoPrevalencia =
      'Ambos ejes de riesgo se encuentran en estado CONFORME. Tu establecimiento acredita condiciones seguras integrales para tramitar la Licencia de Funcionamiento con ITSE Posterior (Declaración Jurada - Anexo 4).';
    estiloPrevalencia = 'border-emerald-300 bg-emerald-50/80 text-emerald-950';
  } else if (!esEje1Conforme && esEje2Conforme) {
    diagnosticoPrevalencia =
      'Aunque el Eje de Evacuación cumple al 100%, prevalece el riesgo del Eje de Incendio y Seguridad Eléctrica por existir observaciones en tableros, puesta a tierra o extintores. Por norma CENEPRED, el riesgo no se promedia para garantizar la vida humana.';
    estiloPrevalencia = 'border-rose-300 bg-rose-50/90 text-rose-950';
  } else if (esEje1Conforme && !esEje2Conforme) {
    diagnosticoPrevalencia =
      'Aunque las instalaciones de fuego y electricidad están en orden, prevalece la criticidad del Eje de Evacuación y Estructuras. Anchos de paso obstruidos o puertas trabadas impiden la evacuación en sismos e incendios.';
    estiloPrevalencia = 'border-amber-300 bg-amber-50/90 text-amber-950';
  } else {
    diagnosticoPrevalencia =
      'Ambos ejes normativos presentan no-conformidades activas. El establecimiento se clasifica en el rango crítico más elevado, siendo mandatorio subsanar las alertas prioritarias antes de solicitar la verificación municipal.';
    estiloPrevalencia = 'border-rose-300 bg-rose-50/90 text-rose-950';
  }

  return (
    <section
      aria-label="Diagnóstico analítico multidimensional de riesgo por ejes CENEPRED"
      className={`rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-6 ${className}`}
    >
      {/* 1. Cabecera Institucional del Diagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Diagnóstico Analítico Multidimensional de Riesgo
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-800">
                Anexo 17 CENEPRED
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Evaluación desglosada {nombreComercio ? `para "${nombreComercio}" ` : ''}por los dos ejes determinantes de la seguridad en edificaciones (D.S. N° 002-2018-PCM / R.J. N° 016-2018-CENEPRED/J).
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-lg w-fit border border-slate-200">
          Matriz Oficial de Riesgos ITSE
        </span>
      </div>

      {/* 2. Cuadrantes de los Dos Ejes Normativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ========================================================================= */}
        {/* EJE 1: RIESGO DE INCENDIO Y SEGURIDAD ELÉCTRICA                           */}
        {/* ========================================================================= */}
        <div
          className={`rounded-2xl border p-5 space-y-4 transition-shadow shadow-2xs ${
            esEje1Conforme
              ? 'border-emerald-200 bg-emerald-50/30'
              : alertas1 > 0 && esPrevia
              ? 'border-rose-200 bg-rose-50/30'
              : 'border-amber-200 bg-amber-50/30'
          }`}
        >
          {/* Cabecera del Eje 1 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  esEje1Conforme
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Eje Determinante 1
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  Riesgo de Incendio y Seguridad Eléctrica
                </h3>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                esEje1Conforme
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {esEje1Conforme ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Conforme</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                  <span>{alertas1} {alertas1 === 1 ? 'Alerta' : 'Alertas'}</span>
                </>
              )}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Protección contra fuego, sobrecargas eléctricas, cortocircuitos, descargas atmosféricas y control seguro de combustibles.
          </p>

          {/* Barra de Score / Conformidad */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Conformidad del Eje</span>
              <span
                className={`font-mono font-black ${
                  esEje1Conforme ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {pct1}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${pct1}%` }}
                className={`h-full rounded-full transition-all duration-700 ${
                  esEje1Conforme ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{cumplidas1} de {total1} condiciones conformes</span>
              <span>{alertas1} por subsanar</span>
            </div>
          </div>

          {/* Criterios clave fiscalizados en este eje */}
          <div className="space-y-2 pt-1 border-t border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-700 block">
              Criterios Normativos Evaluados:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Tableros Eléctricos:</strong> Interruptor diferencial 30 mA y mandil protector sin cables expuestos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Puesta a Tierra:</strong> Medición certificada ≤ 25 Ω por ingeniero electricista habilitado (CIP).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Flame className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Extintores Operativos:</strong> Recarga anual vigente NTP 350.043-1 (PQS y Acetato Clase K).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Combustibles / Gas GLP:</strong> Tanques y balones en zonas ventiladas alejados de fuentes de calor.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* EJE 2: RIESGO DE EVACUACIÓN Y SEGURIDAD ESTRUCTURAL                       */}
        {/* ========================================================================= */}
        <div
          className={`rounded-2xl border p-5 space-y-4 transition-shadow shadow-2xs ${
            esEje2Conforme
              ? 'border-emerald-200 bg-emerald-50/30'
              : 'border-amber-200 bg-amber-50/30'
          }`}
        >
          {/* Cabecera del Eje 2 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  esEje2Conforme
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Footprints className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Eje Determinante 2
                </span>
                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  Riesgo de Evacuación y Seguridad Estructural
                </h3>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                esEje2Conforme
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {esEje2Conforme ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Conforme</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>{alertas2} {alertas2 === 1 ? 'Alerta' : 'Alertas'}</span>
                </>
              )}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Fluidez en rutas de salida, ancho normativo de pasadizos, puertas de escape, aforo regulado y estabilidad sismorresistente.
          </p>

          {/* Barra de Score / Conformidad */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Conformidad del Eje</span>
              <span
                className={`font-mono font-black ${
                  esEje2Conforme ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {pct2}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${pct2}%` }}
                className={`h-full rounded-full transition-all duration-700 ${
                  esEje2Conforme ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>{cumplidas2} de {total2} condiciones conformes</span>
              <span>{alertas2} por subsanar</span>
            </div>
          </div>

          {/* Criterios clave fiscalizados en este eje */}
          <div className="space-y-2 pt-1 border-t border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-700 block">
              Criterios Normativos Evaluados:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Pasadizos y Rutas:</strong> Ancho continuo libre de mercadería ≥ 1.20 m (RNE A.010 Art. 25).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Puertas de Escape:</strong> Apertura hacia el exterior sin cerraduras trabadas durante atención.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Luces y Señalética:</strong> Luminarias autónomas de 90 min y señales fotoluminiscentes de salida.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Layers className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Arriostramiento Sísmico:</strong> Anclaje mecánico rígido de estanterías y muebles &gt; 1.80 m.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Banner Pedagógico del Principio de Prevalencia del Mayor Riesgo */}
      <div className={`rounded-2xl border p-5 space-y-3 ${estiloPrevalencia}`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-2xs">
            <Scale className="h-4 w-4 text-slate-900" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider">
              Principio de Prevalencia del Mayor Riesgo (Anexo 17 CENEPRED)
            </h4>
            <span className="text-[11px] font-medium opacity-90">
              Criterio de ingeniería de seguridad humana no compensatoria
            </span>
          </div>
        </div>

        <p className="text-xs leading-relaxed">
          Conforme a la normativa nacional (<strong>Anexo 17 CENEPRED / D.S. N° 002-2018-PCM</strong>), el nivel de riesgo final <strong>no es un promedio aritmético</strong>: si un establecimiento tiene condiciones seguras en evacuación pero presenta observaciones críticas en electricidad o fuego, <strong>prevalece el nivel de mayor riesgo para salvaguardar la vida</strong>. Una sola falla crítica en el eje de incendio impide la aprobación de la ITSE.
        </p>

        <div className="rounded-xl bg-white/70 p-3.5 border border-black/5 text-xs font-medium space-y-1">
          <strong className="block text-[11px] uppercase tracking-wider text-slate-700">
            Diagnóstico específico para tu establecimiento:
          </strong>
          <p className="leading-relaxed">
            {diagnosticoPrevalencia}
          </p>
        </div>
      </div>

      {/* 4. Bloque de Métricas Analíticas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Nivel Global Resultante
          </span>
          <div className="flex items-center gap-2">
            <ShieldCheck className={`h-4 w-4 ${esPrevia ? 'text-rose-600' : 'text-emerald-600'}`} />
            <span className="text-sm font-bold text-slate-900">
              {esPrevia ? 'Riesgo Alto / Muy Alto' : 'Riesgo Bajo / Medio'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            {esPrevia ? 'Trámite ITSE Previa (Anexo 9)' : 'Trámite ITSE Posterior (Anexo 4)'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Conformidad por Eje
          </span>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800">
            <span className={esEje1Conforme ? 'text-emerald-700' : 'text-rose-600'}>
              Incendio: {pct1}%
            </span>
            <span className="text-slate-300">·</span>
            <span className={esEje2Conforme ? 'text-emerald-700' : 'text-amber-700'}>
              Evacuación: {pct2}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            {totalAlertas === 0 ? 'Sin alertas activas' : `${totalAlertas} alertas combinadas`}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Tiempo Estimado de Subsanación
          </span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {diasEstimadosResolucion}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Plazo preventivo referencial Huancayo
          </span>
        </div>
      </div>
    </section>
  );
}
