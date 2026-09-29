import React, { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { GuiaModal } from '@/components/GuiaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { VideoEducativoModal, RecursoEducativoData } from '@/components/VideoEducativoModal';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Printer,
  ArrowLeft,
  ArrowRight,
  FileText,
  DollarSign,
  Clock,
  ShieldCheck,
  Hash,
  ExternalLink,
  Save,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PlayCircle,
  Info,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { ModalConfirmarReevaluacion } from '@/components/ModalConfirmarReevaluacion';
import {
  CHECKLIST_CATALOGO_OFICIAL,
  CATEGORIA_LABELS,
  CategoriaChecklist,
  RecursoCatalogo,
} from '@/data/checklistCatalogo';

interface TareaPlan {
  codigo: string;
  item: string;
  tarea: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  dias_plazo: number;
  costo_soles: number;
  norma: string;
}

interface PlanAccionData {
  tareas: TareaPlan[];
  costo_total: number;
  total_items: number;
}

interface AutoevaluacionData {
  id: number;
  uuid_trazabilidad: string;
  hash_integridad?: string;
  nombre_comercio: string;
  funcion_economica: string;
  ruc: string;
  sector_huancayo: string;
  direccion?: string | null;
  referencia?: string | null;
  area_m2: number;
  pisos: number;
  aforo: number;
  usa_glp: boolean;
  galones_glp: number;
  tipo_tramite?: string | null;
  nivel_riesgo?: string | null;
  porcentaje_cumplimiento: number;
  semaforo: 'VERDE' | 'AMBAR' | 'ROJO';
  detalle_checklist: Array<{
    codigo: string;
    nombre: string;
    cumple: boolean;
    estado?: string;
    es_critico?: boolean;
    norma?: string;
  }>;
  plan_accion_costos?: PlanAccionData;
  evaluacion_origen_id?: number | null;
  evaluacion_origen?: {
    id: number;
    uuid_trazabilidad: string;
    created_at?: string;
  } | null;
  created_at: string;
}

interface PendienteDetalle {
  numero: number;
  codigo: string;
  nombre: string;
  estado: 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';
  es_critico: boolean;
  norma?: string;
  categoria?: CategoriaChecklist;
  por_que?: string;
  que_observar?: string;
  solucion?: string;
  recurso?: RecursoCatalogo | null;
}

interface Props {
  autoevaluacion: AutoevaluacionData;
  catalogo?: RecursoCatalogo[];
}

type EstadoDeclarado = AutoevaluacionData['detalle_checklist'][number];

function estadoDe(item: EstadoDeclarado): PendienteDetalle['estado'] {
  const estado = item.estado ?? (item.cumple ? 'CUMPLE' : 'NO_CUMPLE');
  if (estado === 'CUMPLE' || estado === 'NO_CUMPLE' || estado === 'POR_REVISAR' || estado === 'NA') {
    return estado;
  }

  return item.cumple ? 'CUMPLE' : 'NO_CUMPLE';
}

export default function Resultado({ autoevaluacion, catalogo = [] }: Props) {
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [tabActiva, setTabActiva] = useState<'FICHA' | 'PLAN' | 'PENDIENTES'>('FICHA');
  const [showGuardarProgreso, setShowGuardarProgreso] = useState<boolean>(false);
  const [showModalReevaluacion, setShowModalReevaluacion] = useState<boolean>(false);
  const [openOrientacion, setOpenOrientacion] = useState<Record<string, boolean>>({});
  const [recursoActivo, setRecursoActivo] = useState<RecursoEducativoData | null>(null);
  const { auth } = usePage().props as { auth?: { user: { id: number; name: string } | null } };
  const esInvitado = !auth?.user;
  const esReevaluacion = Boolean(autoevaluacion.evaluacion_origen_id || autoevaluacion.evaluacion_origen);

  const urlSimulacion =
    typeof window !== 'undefined'
      ? `${window.location.origin}/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`
      : `/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`;

  const plan = autoevaluacion.plan_accion_costos || {
    tareas: [],
    costo_total: 0,
    total_items: 0,
  };

  const recursosPorCodigo = useMemo(
    () => new Map<string, RecursoCatalogo>(catalogo.map((recurso) => [recurso.codigo, recurso])),
    [catalogo]
  );

  const detalleChecklist = useMemo(
    () => autoevaluacion.detalle_checklist || [],
    [autoevaluacion.detalle_checklist]
  );

  const pendientes = useMemo<PendienteDetalle[]>(() => {
    const enriquecer = (item: EstadoDeclarado, idx: number): PendienteDetalle => {
      const catalogoItem = CHECKLIST_CATALOGO_OFICIAL.find((c) => c.codigo === item.codigo);

      return {
        numero: idx + 1,
        codigo: item.codigo,
        nombre: item.nombre,
        estado: estadoDe(item),
        es_critico: item.es_critico ?? false,
        norma: item.norma,
        categoria: catalogoItem?.categoria,
        por_que: catalogoItem?.por_que,
        que_observar: catalogoItem?.que_observar,
        solucion: catalogoItem?.solucion,
        recurso: recursosPorCodigo.get(item.codigo) ?? null,
      };
    };

    return detalleChecklist.map(enriquecer);
  }, [detalleChecklist, recursosPorCodigo]);

  const noCumple = pendientes.filter((p) => p.estado === 'NO_CUMPLE');
  const porRevisar = pendientes.filter((p) => p.estado === 'POR_REVISAR');
  const cumpleCount = pendientes.filter((p) => p.estado === 'CUMPLE').length;
  const naCount = pendientes.filter((p) => p.estado === 'NA').length;
  const hayNoCumple = noCumple.length > 0;
  const hayPorRevisar = porRevisar.length > 0;
  const hayFallaCritica = noCumple.some((p) => p.es_critico);
  const pendientesTotal = noCumple.length + porRevisar.length;

  const descripcionSemaforo = (() => {
    if (autoevaluacion.semaforo === 'VERDE') {
      return 'Declaraste cumplir todas las condiciones técnicas de seguridad que corresponden a tu establecimiento, según tu propia evaluación. Mantén la evidencia de cada condición al día. El resultado refleja lo declarado en esta autoevaluación. No constituye una aprobación o certificación oficial.';
    }

    if (autoevaluacion.semaforo === 'AMBAR') {
      if (hayNoCumple) {
        return `Declaraste ${noCumple.length} condición(es) como pendiente(s) de atender y ${porRevisar.length} aspecto(s) todavía por revisar. Avanza en tu preparación y registra tu plan de subsanación preventiva. El resultado refleja lo declarado en esta autoevaluación.`;
      }

      if (hayPorRevisar) {
        return `Declaraste ${porRevisar.length} aspecto(s) que todavía están por revisar. Completar esas verificaciones te permite afinar tu nivel de preparación antes de una eventual visita técnica. El resultado refleja lo declarado en esta autoevaluación.`;
      }

      return 'Existen condiciones que aún declaras como no cumplidas o por revisar. Avanza en preparación y registra tu plan de subsanación preventiva. El resultado refleja lo declarado en esta autoevaluación.';
    }

    if (hayFallaCritica) {
      return 'Declaraste fallas críticas de seguridad (riesgo de incendio o electrocución). Por tu seguridad, prioriza atenderlas antes de una eventual visita técnica municipal. El resultado refleja lo declarado en esta autoevaluación.';
    }

    if (hayNoCumple) {
      return 'Declaraste varias condiciones como pendientes de atender. Tu nivel de preparación es bajo; revisa el detalle y prioriza las acciones de mejora. El resultado refleja lo declarado en esta autoevaluación.';
    }

    if (hayPorRevisar) {
      return 'Aún tienes aspectos por revisar antes de considerar completa tu preparación. No declaraste incumplimientos confirmados; determina el estado real de cada aspecto señalado. El resultado refleja lo declarado en esta autoevaluación.';
    }

    return 'Autoevaluación procesada según lo declarado en este registro.';
  })();

  const configSemaforo = {
    VERDE: {
      titulo: 'Nivel de Preparación Alto',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      badgeBg: 'bg-emerald-600',
      descripcion: descripcionSemaforo,
      icono: CheckCircle2,
    },
    AMBAR: {
      titulo: 'Nivel de Preparación Medio (Con Observaciones)',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-600',
      descripcion: descripcionSemaforo,
      icono: AlertTriangle,
    },
    ROJO: {
      titulo: 'Nivel de Preparación Crítico',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-danger-900',
      badgeBg: 'bg-danger-900',
      descripcion: descripcionSemaforo,
      icono: ShieldAlert,
    },
  }[autoevaluacion.semaforo] || {
    titulo: 'Autoevaluado',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-800',
    badgeBg: 'bg-neutral-700',
    descripcion: descripcionSemaforo,
    icono: ShieldCheck,
  };

  const IconoSemaforo = configSemaforo.icono;

  const toggleOrientacion = (codigo: string) => {
    setOpenOrientacion((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const abrirRecurso = (pendiente: PendienteDetalle) => {
    if (!pendiente.recurso?.video_url) return;

    setRecursoActivo({
      titulo: pendiente.nombre,
      video_url: pendiente.recurso.video_url,
      tipo: pendiente.recurso.tipo,
      base_legal: pendiente.recurso.base_legal,
      evidencia_sugerida: pendiente.recurso.evidencia_sugerida,
      descripcion: pendiente.recurso.descripcion,
    });
  };

  const consejoProfesional = (pendiente: PendienteDetalle): string => {
    switch (pendiente.categoria) {
      case 'ELECTRICIDAD':
        return 'Para condiciones eléctricas, evita modificaciones por tu cuenta. Si requieres intervenir el tablero, el cableado o el pozo a tierra, conviene que lo revise un profesional electricista calificado.';
      case 'INCENDIOS':
        return 'Para equipos de protección contra incendios (recarga de extintores, mantenimiento o instalación), considera contar con una empresa o técnico autorizado para esas intervenciones.';
      case 'EVACUACION':
        return 'Para rutas de salida, puertas o señalización, si después de revisar no tienes certeza del cumplimiento, consulta a un profesional en instalaciones.';
      case 'ESTRUCTURAL_AUXILIOS':
        return 'Para anclajes, vidrios o elementos estructurales, si después de revisar no tienes certeza del cumplimiento, conviene consultar a un ingeniero o profesional calificado.';
      default:
        return 'Si después de revisar no tienes certeza sobre el cumplimiento técnico del aspecto, conviene consultar a un profesional calificado.';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderPendienteCard = (pendiente: PendienteDetalle) => {
    const abierto = openOrientacion[pendiente.codigo] ?? false;
    const badgeEstado =
      pendiente.estado === 'NO_CUMPLE'
        ? 'Pendiente identificado'
        : 'Por revisar';
    const badgeClases =
      pendiente.estado === 'NO_CUMPLE'
        ? 'bg-danger-900 text-white'
        : 'bg-amber-100 text-amber-800';

    return (
      <div
        key={pendiente.codigo}
        className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs text-left space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
              {pendiente.numero}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badgeClases}`}>
                  {badgeEstado}
                </span>
                {pendiente.es_critico && pendiente.estado === 'NO_CUMPLE' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-neutral-900 text-white">
                    Prioridad preventiva
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-neutral-900 mt-1.5 leading-snug">{pendiente.nombre}</h4>
              {pendiente.categoria && (
                <p className="text-[11px] text-neutral-500 mt-1">
                  Categoría: <strong className="text-neutral-700">{CATEGORIA_LABELS[pendiente.categoria]}</strong>
                  {pendiente.norma && <span className="font-mono ml-1.5 text-neutral-400">{pendiente.norma}</span>}
                </p>
              )}
            </div>
          </div>
        </div>

        {pendiente.por_que && (
          <p className="text-xs text-neutral-600 leading-relaxed">{pendiente.por_que}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => toggleOrientacion(pendiente.codigo)}
            aria-expanded={abierto}
            aria-controls={`orientacion-${pendiente.codigo}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3.5 py-2 rounded-xl transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Consultar orientación</span>
            {abierto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {pendiente.recurso?.video_url && (
            <button
              type="button"
              onClick={() => abrirRecurso(pendiente)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-primary-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Ver guía / video</span>
            </button>
          )}
        </div>

        {abierto && (
          <div
            id={`orientacion-${pendiente.codigo}`}
            className="mt-1 space-y-3 rounded-2xl bg-neutral-50 border border-neutral-200 p-4"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-primary-50 text-primary-700 border border-primary-100 rounded-lg shrink-0">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-neutral-900">¿Qué identificaste?</strong>
                <p className="text-xs text-neutral-700 leading-relaxed">{pendiente.por_que || pendiente.nombre}</p>
              </div>
            </div>

            {pendiente.que_observar && (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-info-50 text-info-700 border border-info-100 rounded-lg shrink-0">
                  <Info className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-xs font-bold text-neutral-900">¿Qué puedes revisar?</strong>
                  <p className="text-xs text-neutral-700 leading-relaxed">{pendiente.que_observar}</p>
                </div>
              </div>
            )}

            {pendiente.solucion && (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-success-50 text-success-700 border border-success-100 rounded-lg shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="block text-xs font-bold text-neutral-900">¿Qué puedes hacer?</strong>
                  <p className="text-xs text-neutral-700 leading-relaxed">{pendiente.solucion}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-neutral-900">
                  ¿Cuándo conviene consultar a un profesional?
                </strong>
                <p className="text-xs text-neutral-700 leading-relaxed">{consejoProfesional(pendiente)}</p>
              </div>
            </div>

            {pendiente.recurso?.base_legal && (
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-start gap-2 text-xs text-neutral-700">
                <FileText className="w-3.5 h-3.5 text-danger-900 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[10px] uppercase tracking-wider text-danger-900 block">Base legal referencial</strong>
                  <span className="font-mono">{pendiente.recurso.base_legal}</span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-neutral-500 leading-relaxed flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neutral-400" />
              <span>
                Esta orientación es educativa y preventiva. Lo que registres refleja tu declaración ciudadana; no reemplaza la
                verificación que realiza la autoridad competente.
              </span>
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head
        title={
          esReevaluacion
            ? `Resultado de tu nueva autoevaluación - ${autoevaluacion.nombre_comercio}`
            : `Resultado de tu autoevaluación - ${autoevaluacion.nombre_comercio}`
        }
      />

      <div className="print:hidden">
        <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
        <ModalGuardarProgreso
          isOpen={showGuardarProgreso}
          onClose={() => setShowGuardarProgreso(false)}
          uuid={autoevaluacion.uuid_trazabilidad}
          establecimiento={autoevaluacion.nombre_comercio}
        />
        <ModalConfirmarReevaluacion
          isOpen={showModalReevaluacion}
          onClose={() => setShowModalReevaluacion(false)}
          uuid={autoevaluacion.uuid_trazabilidad}
          nombreComercio={autoevaluacion.nombre_comercio}
        />
        <VideoEducativoModal
          isOpen={!!recursoActivo}
          onClose={() => setRecursoActivo(null)}
          recurso={recursoActivo}
        />
      </div>

      <div className="max-w-4xl mx-auto print:max-w-none">

        {/* Barra Superior con Acciones Rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/autoevaluacion"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-1.5 bg-white border border-neutral-200 rounded-xl shadow-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Nueva Simulación
            </Link>

            {esInvitado && (
              <button
                type="button"
                onClick={() => setShowGuardarProgreso(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 bg-primary-50/60 hover:bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar mi progreso para continuar después
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowModalReevaluacion(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50/70 hover:bg-primary-50 border border-primary-200 px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Volver a evaluar</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-3.5 py-1.5 rounded-xl hover:bg-neutral-50 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Exportar PDF</span>
            </button>

            <Link
              href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-danger-900 hover:bg-danger-800 px-3.5 py-1.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plan de Subsanación Preventiva</span>
            </Link>
          </div>
        </div>

        {/* Encabezado Cívico de la Autoevaluación */}
        <div className="mb-6 text-left print:break-inside-avoid">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
              {esReevaluacion ? 'Nueva Autoevaluación Preventiva' : 'Autoevaluación Preventiva'} · Huancayo
            </span>
            {esReevaluacion && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Resultado Actualizado
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 mt-2 tracking-tight">
            {esReevaluacion ? 'Resultado de tu nueva autoevaluación' : 'Resultado de tu autoevaluación'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {esReevaluacion
              ? 'Esta evaluación se realizó nuevamente para revisar el estado actual declarado del establecimiento.'
              : 'Diagnóstico cívico de preparación técnica de seguridad para tu establecimiento comercial.'}
          </p>
        </div>

        {/* Referencia contextual para reevaluaciones */}
        {esReevaluacion && (
          <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/90 p-4 text-left flex items-start gap-3 text-xs mb-6 text-emerald-950 print:break-inside-avoid">
            <RefreshCw className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-900">
                Esta es una nueva autoevaluación. La evaluación anterior se conserva sin cambios.
              </p>
              <p className="text-emerald-800/90 text-[11px] leading-relaxed">
                Esta evaluación se realizó nuevamente para revisar el estado actual declarado del establecimiento. Este resultado refleja exclusivamente lo que declaraste en esta nueva evaluación.
              </p>
            </div>
          </div>
        )}

        {/* Aviso preventivo de no-oficialidad */}
        <div className="rounded-2xl bg-neutral-50 border border-neutral-200/80 p-3.5 text-left flex items-start gap-2.5 text-xs text-neutral-600 mb-6 print:break-inside-avoid">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Aviso preventivo:</strong> Este resultado corresponde a una autoevaluación declarada por el ciudadano y no constituye una aprobación, certificación ni inspección oficial.
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6 print:hidden">
          <button
            type="button"
            onClick={() => setTabActiva('FICHA')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              tabActiva === 'FICHA'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ficha de Autoevaluación y Trazabilidad</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('PENDIENTES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              tabActiva === 'PENDIENTES'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Aspectos que requieren atención ({pendientesTotal})</span>
          </button>

          {plan.tareas.length > 0 && (
            <button
              type="button"
              onClick={() => setTabActiva('PLAN')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                tabActiva === 'PLAN'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Plan de Preparación con Costos ({plan.total_items} pendientes)</span>
            </button>
          )}
        </div>

        {/* CONTENIDO DE PESTAÑA: FICHA */}
        {tabActiva === 'FICHA' && (
          <div className="space-y-6">

            {/* Tarjeta del Semáforo */}
            <div className={`rounded-3xl border p-6 text-left shadow-xs ${configSemaforo.bg} ${configSemaforo.border}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${configSemaforo.badgeBg}`}>
                    <IconoSemaforo className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${configSemaforo.badgeBg}`}>
                        Nivel {autoevaluacion.semaforo}
                      </span>
                      <span className="text-xs font-bold text-neutral-500">
                        {autoevaluacion.porcentaje_cumplimiento}% de Preparación Declarada
                      </span>
                    </div>
                    <h2 className={`text-xl font-extrabold mt-1 ${configSemaforo.text}`}>
                      {configSemaforo.titulo}
                    </h2>
                    <p className="text-xs text-neutral-600 mt-1 max-w-xl">
                      {configSemaforo.descripcion}
                    </p>
                  </div>
                </div>

                {autoevaluacion.tipo_tramite && (
                  <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200/60">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase block">Modalidad Proyectada:</span>
                    <span className="text-sm font-extrabold text-neutral-900">
                      {autoevaluacion.tipo_tramite === 'EX_POST' ? 'ITSE Posterior (Ex-Post)' : 'ITSE Previa (Ex-Ante)'}
                    </span>
                    {autoevaluacion.nivel_riesgo && (
                      <span className="text-[10px] text-neutral-500 block mt-0.5">
                        Riesgo declarado: <strong>{autoevaluacion.nivel_riesgo.replace('_', ' ')}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expediente de Autoevaluación Preventiva con QR y Hash */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 text-left shadow-xs space-y-6">

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-100 pb-6 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                    Expediente Digital de Autoevaluación Preventiva · Huancayo
                  </span>
                  <h3 className="text-xl font-extrabold text-neutral-900 mt-2">
                    {autoevaluacion.nombre_comercio}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    RUC: <strong className="font-mono">{autoevaluacion.ruc}</strong> · Giro: <strong>{autoevaluacion.funcion_economica}</strong>
                  </p>
                  {(autoevaluacion.direccion || autoevaluacion.referencia) && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {[autoevaluacion.direccion, autoevaluacion.referencia].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Enlace de seguimiento — el QR se retiró para unificar con InformePreventivo */}
                <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 self-center sm:self-auto">
                  <div className="text-[10px] text-neutral-500 space-y-1">
                    <span className="block font-bold text-neutral-800 text-xs">Seguimiento Preventivo</span>
                    <p className="leading-tight text-neutral-500">
                      Abre tu simulación de revisión in situ y da seguimiento a tu plan de preparación.
                    </p>
                    <a
                      href={urlSimulacion}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-danger-900 font-bold hover:underline pt-1"
                    >
                      <span>Simulación de Revisión In Situ</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Parámetros de Escala y Emplazamiento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Área Techada</span>
                  <span className="font-bold text-neutral-800">{autoevaluacion.area_m2} m²</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Pisos / Aforo</span>
                  <span className="font-bold text-neutral-800">{autoevaluacion.pisos} piso(s) / {autoevaluacion.aforo} pers.</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Carga Térmica</span>
                  <span className="font-bold text-neutral-800">
                    {autoevaluacion.usa_glp ? `${autoevaluacion.galones_glp} Galones GLP` : 'Sin GLP'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Sector Territorial</span>
                  <span className="font-bold text-neutral-800 truncate block">{autoevaluacion.sector_huancayo}</span>
                </div>
              </div>

              {/* Trazabilidad criptográfica SHA-256 */}
              <div className="p-3.5 bg-neutral-900 text-neutral-300 rounded-2xl text-[11px] font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate max-w-full">
                  <Hash className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-neutral-400">UUID:</span>
                  <span className="text-white select-all">{autoevaluacion.uuid_trazabilidad}</span>
                </div>
                {autoevaluacion.hash_integridad && (
                  <span className="text-[10px] text-neutral-400 truncate">
                    Integridad SHA256: {autoevaluacion.hash_integridad.substring(0, 16)}...
                  </span>
                )}
              </div>

              {/* Detalle del Checklist Resumido */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  Condiciones de Seguridad Autodeclaradas
                </h4>
                <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
                  {detalleChecklist.map(item => (
                    <div key={item.codigo} className="p-3.5 flex items-center justify-between text-xs bg-white">
                      <div className="pr-4">
                        <span className="font-medium text-neutral-800 block">{item.nombre}</span>
                        {item.norma && <span className="text-[10px] text-neutral-400 font-mono">{item.norma}</span>}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                        item.estado === 'CUMPLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.estado === 'POR_REVISAR'
                          ? 'bg-amber-100 text-amber-800'
                          : item.estado === 'NA'
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-rose-100 text-danger-900'
                      }`}>
                        {item.estado || (item.cumple ? 'CUMPLE' : 'NO CUMPLE')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* CONTENIDO DE PESTAÑA: ASPECTOS QUE REQUIEREN ATENCIÓN */}
        {tabActiva === 'PENDIENTES' && (
          <div className="space-y-6">

            {/* Encabezado con resumen declarado */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-danger-900 px-2.5 py-0.5 rounded-full border border-rose-100">
                Identificación de pendientes
              </span>
              <h3 className="text-xl font-extrabold text-neutral-900 mt-1.5">
                Aspectos que requieren atención
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
                Resumen de lo que declaraste, diferenciando los pendientes que identificaste de los aspectos que todavía
                están por revisar. El estado de cada condición refleja tu autoevaluación ciudadana.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-left">
                  <span className="text-[10px] font-bold uppercase text-danger-900 block">Pendientes identificados</span>
                  <span className="text-2xl font-extrabold text-danger-900">{noCumple.length}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-left">
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Por revisar</span>
                  <span className="text-2xl font-extrabold text-amber-800">{porRevisar.length}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-left">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Declaras cumplir</span>
                  <span className="text-2xl font-extrabold text-emerald-700">{cumpleCount}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-left">
                  <span className="text-[10px] font-bold uppercase text-neutral-600 block">No aplica</span>
                  <span className="text-2xl font-extrabold text-neutral-600">{naCount}</span>
                </div>
              </div>
            </div>

            {pendientesTotal === 0 ? (
              <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-950">
                  Declaraste que todos los aspectos revisados cumplen, según tu propia evaluación
                </h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-xl mx-auto">
                  Declaraste que los {cumpleCount} aspectos que corresponden a tu establecimiento están atendidos
                  {naCount > 0 ? ` (y ${naCount} no aplica(n) según tus respuestas)` : ''}. Mantén tus evidencias al día.
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-2 max-w-xl mx-auto">
                  El resultado refleja lo declarado en esta autoevaluación. No constituye una aprobación o certificación oficial.
                </p>
              </div>
            ) : (
              <>
                {noCumple.length > 0 && (
                  <section aria-labelledby="grupo-no-cumple" className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 id="grupo-no-cumple" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Pendientes que identificaste (declaraste que aún no están atendidos)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-900 text-white">
                        {noCumple.length}
                      </span>
                    </div>
                    {noCumple.map(renderPendienteCard)}
                  </section>
                )}

                {porRevisar.length > 0 && (
                  <section aria-labelledby="grupo-por-revisar" className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 id="grupo-por-revisar" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Aspectos todavía por revisar (aún no tienes certeza)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {porRevisar.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 -mt-1">
                      Que un aspecto esté «por revisar» no significa que incumpla: solo declaraste que todavía no
                      determinaste su estado. Completar estas verificaciones te permite afinar tu nivel de preparación.
                    </p>
                    {porRevisar.map(renderPendienteCard)}
                  </section>
                )}

                {hayNoCumple && (
                  <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 text-left text-xs text-neutral-700 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-danger-900 shrink-0 mt-0.5" />
                    <p>
                      Cuando declares que una condición quedó atendida, podrás registrarlo en tu{' '}
                      <Link href={`/autoevaluacion/subsanacion/${autoevaluacion.uuid_trazabilidad}`} className="font-bold text-danger-900 underline">
                        Plan de Subsanación Preventiva
                      </Link>{' '}
                      y llevar el seguimiento de tus acciones de mejora.
                    </p>
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* CONTENIDO DE PESTAÑA: PLAN DE PREPARACIÓN CON COSTOS */}
        {tabActiva === 'PLAN' && (
          <div className="space-y-6">

            {/* Encabezado del Presupuesto */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-danger-900 px-2.5 py-0.5 rounded-full border border-rose-100">
                    Referencia Técnica y Económica Local
                  </span>
                  <h3 className="text-xl font-extrabold text-neutral-900 mt-1.5">
                    Plan de Preparación y Presupuesto de Adecuación
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Ruta orientativa para cerrar las brechas que declaras antes de una eventual visita técnica municipal.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 block">Presupuesto Estimado</span>
                  <span className="text-2xl font-extrabold text-danger-900">
                    S/ {plan.costo_total.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Mano de obra y materiales Huancayo</span>
                </div>
              </div>
            </div>

            {/* Listado de Tareas Priorizadas */}
            {plan.tareas.length === 0 ? (
              porRevisar.length > 0 ? (
                <div className="p-8 rounded-3xl bg-amber-50 border border-amber-200 text-center shadow-xs">
                  <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-amber-950">No declaraste pendientes con acciones de mejora</h4>
                  <p className="text-xs text-amber-800 mt-1 max-w-xl mx-auto">
                    Aún tienes {porRevisar.length} aspecto(s) por revisar. La orientación aparece en la pestaña{' '}
                    «Aspectos que requieren atención»: determina el estado real de cada condición para decidir si necesitas
                    una acción de mejora.
                  </p>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-950">Sin brechas declaradas</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Declaraste cumplir todas las condiciones evaluadas. Mantén tus evidencias al día para conservar un buen nivel de preparación.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {plan.tareas.map((tarea, idx) => (
                  <div key={idx} className="bg-white border border-neutral-200/80 rounded-3xl p-5 text-left shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          tarea.prioridad === 'Alta'
                            ? 'bg-rose-100 text-danger-900'
                            : tarea.prioridad === 'Media'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          Prioridad {tarea.prioridad} ({tarea.dias_plazo} días sugerido)
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">{tarea.norma}</span>
                      </div>

                      <span className="text-xs font-bold text-neutral-900 bg-neutral-50 border border-neutral-200 px-3 py-1 rounded-xl self-end sm:self-auto">
                        Costo Est: S/ {tarea.costo_soles.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900">{tarea.tarea}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Condición declarada pendiente: <strong className="text-neutral-700">{tarea.item}</strong>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Plazo sugerido: {tarea.dias_plazo} días hábiles
                      </span>
                      <span className="text-neutral-500">
                        R.J. 016-2018 Num. 2.1.1.2
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tarjeta de Fundamento */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 text-left text-xs text-neutral-600">
              <strong className="block font-bold text-neutral-800 mb-1">Referencia Metodológica:</strong>
              La estructuración secuencial de acciones con plazos y presupuesto referencial reduce las brechas que suelen detectarse en las visitas técnicas de fiscalización municipal (USM, 2026). Este plan es una orientación didáctica, no un requisito oficial.
            </div>

            {/* Siguiente paso */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowModalReevaluacion(true)}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-5 py-3.5 rounded-2xl hover:bg-neutral-50 shadow-xs transition cursor-pointer w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 text-primary-600" />
                <span>Volver a evaluar establecimiento</span>
              </button>

              <Link
                href={`/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`}
                className="inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-6 py-3.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer w-full sm:w-auto"
              >
                <span>Continuar con la Simulación de Revisión In Situ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        )}

      </div>
    </>
  );
}
