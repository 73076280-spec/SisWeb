import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertCircle,
  Info,
  ShieldAlert,
  Save,
  Check,
  Building2,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  BookOpen,
  Flame,
  Footprints,
  Zap,
  Shield,
  FileEdit,
} from 'lucide-react';
import type { ChecklistProps, CriterioEvaluable } from '@/types/contrato';

interface OpcionConfig {
  label: string;
  descripcion: string;
  icono: React.ComponentType<{ className?: string }>;
  borderSelected: string;
  bgSelected: string;
  ringSelected: string;
  textSelected: string;
  iconSelected: string;
  radioAccent: string;
}

const OPCIONES_ETIQUETAS: Record<string, OpcionConfig> = {
  CUMPLE_DECLARADO: {
    label: 'Cumple según lo declarado',
    descripcion: 'El establecimiento cuenta con esta condición según su propia declaración.',
    icono: CheckCircle2,
    borderSelected: 'border-emerald-600',
    bgSelected: 'bg-emerald-50/40',
    ringSelected: 'ring-1 ring-emerald-600',
    textSelected: 'text-emerald-950',
    iconSelected: 'text-emerald-600',
    radioAccent: 'text-emerald-600 focus:ring-emerald-500',
  },
  PENDIENTE_ATENDER: {
    label: 'Pendiente de atender',
    descripcion: 'Requiere corrección, adquisición o mantenimiento antes de una inspección oficial.',
    icono: Clock,
    borderSelected: 'border-amber-600',
    bgSelected: 'bg-amber-50/40',
    ringSelected: 'ring-1 ring-amber-600',
    textSelected: 'text-amber-950',
    iconSelected: 'text-amber-600',
    radioAccent: 'text-amber-600 focus:ring-amber-500',
  },
  POR_REVISAR: {
    label: 'Por revisar',
    descripcion: 'Falta comprobar o consultar con un técnico especializado.',
    icono: HelpCircle,
    borderSelected: 'border-sky-600',
    bgSelected: 'bg-sky-50/40',
    ringSelected: 'ring-1 ring-sky-600',
    textSelected: 'text-sky-950',
    iconSelected: 'text-sky-600',
    radioAccent: 'text-sky-600 focus:ring-sky-500',
  },
};

interface AreaNormativa {
  id: string;
  nombre: string;
  icono: React.ComponentType<{ className?: string }>;
  criterios: CriterioEvaluable[];
}

function agruparCriteriosPorArea(criterios: CriterioEvaluable[]): AreaNormativa[] {
  const definiciones = [
    {
      id: 'incendios',
      nombre: 'Protección Contra Incendios',
      icono: Flame,
      match: (cat: string) => cat.toLowerCase().includes('incendio'),
    },
    {
      id: 'evacuacion',
      nombre: 'Medios de Evacuación y Señalización',
      icono: Footprints,
      match: (cat: string) =>
        (cat.toLowerCase().includes('evacuación') || cat.toLowerCase().includes('señalización')) &&
        !cat.toLowerCase().includes('eléctric'),
    },
    {
      id: 'electricas',
      nombre: 'Instalaciones Eléctricas',
      icono: Zap,
      match: (cat: string) => cat.toLowerCase().includes('eléctric'),
    },
    {
      id: 'gas',
      nombre: 'Instalaciones de Gas',
      icono: Flame,
      match: (cat: string) => cat.toLowerCase().includes('gas') || cat.toLowerCase().includes('glp'),
    },
    {
      id: 'estructuras',
      nombre: 'Seguridad Estructural y Prevención Sísmica',
      icono: Shield,
      match: (cat: string) =>
        cat.toLowerCase().includes('estructur') ||
        cat.toLowerCase().includes('sísmic') ||
        cat.toLowerCase().includes('accesibilidad') ||
        cat.toLowerCase().includes('almacenamiento'),
    },
  ];

  const areas: AreaNormativa[] = definiciones.map((d) => ({
    id: d.id,
    nombre: d.nombre,
    icono: d.icono,
    criterios: [],
  }));

  for (const c of criterios) {
    const cat = c.categoria || '';
    const area = areas.find((a) => {
      const def = definiciones.find((d) => d.id === a.id);
      return def?.match(cat);
    });

    if (area) {
      area.criterios.push(c);
    } else if (areas.length > 0) {
      areas[0].criterios.push(c);
    }
  }

  return areas.filter((a) => a.criterios.length > 0);
}

export default function Checklist({ autoevaluacion, checklist }: ChecklistProps) {
  const { auth } = usePage().props as { auth?: { user: any | null } };
  const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
  const [modalRecurso, setModalRecurso] = useState<{
    isOpen: boolean;
    recursos: RecursoEducativoData[];
    codigo?: string;
    titulo?: string;
  }>({
    isOpen: false,
    recursos: [],
  });

  const criteriosAplicables = useMemo(() => checklist?.criterios ?? [], [checklist]);
  const criteriosNoAplican = useMemo(() => checklist?.no_aplican ?? [], [checklist]);
  const criteriosPendientes = useMemo(() => checklist?.informacion_pendiente ?? [], [checklist]);

  // Agrupación dinámica por 5 áreas normativas naturales
  const areas = useMemo(() => agruparCriteriosPorArea(criteriosAplicables), [criteriosAplicables]);

  // Inicializar respuestas locales a partir de los estados previos que el backend entregue
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const c of criteriosAplicables) {
      if (c.estado && c.estado !== 'NO_APLICA') {
        inicial[c.codigo] = c.estado;
      }
    }
    return inicial;
  });

  // Inicializar notas privadas del ciudadano
  const [notas, setNotas] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const c of criteriosAplicables) {
      if (c.notas) {
        inicial[c.codigo] = c.notas;
      }
    }
    return inicial;
  });

  // Visibilidad de los campos de notas
  const [mostrarNotas, setMostrarNotas] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    for (const c of criteriosAplicables) {
      if (c.notas) {
        inicial[c.codigo] = true;
      }
    }
    return inicial;
  });

  const [criteriosGuardados, setCriteriosGuardados] = useState<Record<string, boolean>>(() => {
    const inicial: Record<string, boolean> = {};
    for (const c of criteriosAplicables) {
      if (c.estado && c.estado !== 'NO_APLICA') {
        inicial[c.codigo] = true;
      }
    }
    return inicial;
  });

  const [guardandoAvance, setGuardandoAvance] = useState<boolean>(false);
  const [guardandoContinuar, setGuardandoContinuar] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mostrarNoAplican, setMostrarNoAplican] = useState<boolean>(false);
  const [mostrarPendientes, setMostrarPendientes] = useState<boolean>(true);

  // Cantidad de criterios aplicables con respuesta seleccionada
  const respondidosCount = useMemo(() => {
    return criteriosAplicables.filter((c) => Boolean(respuestas[c.codigo])).length;
  }, [criteriosAplicables, respuestas]);

  const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';
  const todosRespondidos = respondidosCount === criteriosAplicables.length && criteriosAplicables.length > 0;
  const puedeVerResumen = todosRespondidos || esRegistrada;

  const seleccionarRespuesta = (codigo: string, estado: string) => {
    if (esRegistrada) {
      return;
    }

    setRespuestas((prev) => ({
      ...prev,
      [codigo]: estado,
    }));

    // Si el usuario cambia su respuesta, ya no se considera "guardada" en el servidor hasta que presione guardar
    setCriteriosGuardados((prev) => ({
      ...prev,
      [codigo]: false,
    }));

    // Si selecciona PENDIENTE_ATENDER o POR_REVISAR, abrir automáticamente el campo de notas si aún no tiene
    if (estado === 'PENDIENTE_ATENDER' || estado === 'POR_REVISAR') {
      setMostrarNotas((prev) => ({ ...prev, [codigo]: true }));
    }

    setMensajeExito(null);
    setMensajeError(null);
  };

  // Acción Secundaria: Guardar Avance (persiste desde 1 respuesta, mantiene INICIADA)
  const handleGuardarAvance = async () => {
    if (esRegistrada) return;

    const respuestasAEnviar = Object.entries(respuestas)
      .filter(([_, estado]) => Boolean(estado))
      .map(([codigo, estado]) => ({
        codigo,
        estado,
        notas: (notas[codigo] || '').trim() || null,
      }));

    if (respuestasAEnviar.length === 0) {
      setMensajeError('Seleccione al menos una declaración para guardar avance.');
      return;
    }

    setGuardandoAvance(true);
    setMensajeError(null);
    setMensajeExito(null);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ respuestas: respuestasAEnviar }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensajeExito(
          `Avance guardado correctamente (${respuestasAEnviar.length} de ${criteriosAplicables.length} respondidos). Puede continuar en cualquier momento.`
        );
        const nuevosGuardados = { ...criteriosGuardados };
        for (const item of respuestasAEnviar) {
          nuevosGuardados[item.codigo] = true;
        }
        setCriteriosGuardados(nuevosGuardados);
      } else if (response.status === 422) {
        const errorMsg =
          data.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat().join(' ')
            : data.message || 'Algunas declaraciones no son válidas.';
        setMensajeError(errorMsg);
      } else {
        setMensajeError(data.mensaje || 'No fue posible guardar su avance. Intente nuevamente.');
      }
    } catch {
      setMensajeError('No fue posible guardar su avance. Verifique su conexión e intente nuevamente.');
    } finally {
      setGuardandoAvance(false);
    }
  };

  // Acción Principal: Continuar al Resumen (comprueba 100%, persiste y redirige a /resumen)
  const handleContinuarAlResumen = async () => {
    if (esRegistrada) {
      router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`);
      return;
    }

    const faltantes = criteriosAplicables.filter((c) => !respuestas[c.codigo]);
    if (faltantes.length > 0) {
      setMensajeError(
        `Tiene ${faltantes.length} criterio(s) sin responder. Por favor, declare la situación de todas las condiciones aplicables para continuar al resumen.`
      );
      const primerFaltanteElem = document.getElementById(`criterio-${faltantes[0].codigo}`);
      if (primerFaltanteElem) {
        primerFaltanteElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setGuardandoContinuar(true);
    setMensajeError(null);
    setMensajeExito(null);

    const respuestasAEnviar = criteriosAplicables.map((c) => ({
      codigo: c.codigo,
      estado: respuestas[c.codigo],
      notas: (notas[c.codigo] || '').trim() || null,
    }));

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/checklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ respuestas: respuestasAEnviar }),
      });

      if (response.ok) {
        router.visit(`/autoevaluacion/${autoevaluacion.uuid}/resumen`);
      } else {
        const data = await response.json();
        setMensajeError(data.mensaje || 'No fue posible guardar las declaraciones para continuar. Intente nuevamente.');
        setGuardandoContinuar(false);
      }
    } catch {
      setMensajeError('Ocurrió un error al intentar continuar al resumen. Intente nuevamente.');
      setGuardandoContinuar(false);
    }
  };

  return (
    <>
      <Head title="Paso 2 de 3: Checklist de Autoevaluación - CheckITSE Huancayo" />

      <div className="mx-auto max-w-4xl space-y-8 pb-32">
        {/* Encabezado Institucional Preventivo con Indicador Secuencial */}
        <header className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          {/* Indicador de 3 Pasos coherente con Nueva.tsx */}
          <nav aria-label="Progreso de autoevaluación" className="mb-4">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold">
              <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Check className="h-3 w-3" />
                <span>Paso 1: Datos</span>
              </div>
              <span className="text-neutral-300">/</span>
              <div className="flex items-center gap-1 text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 ring-2 ring-blue-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Paso 2 de 3: Checklist</span>
              </div>
              <span className="text-neutral-300">/</span>
              <div className="flex items-center gap-1 text-neutral-400 px-2 py-0.5">
                <span>Paso 3: Resumen</span>
              </div>
            </div>
          </nav>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Building2 className="h-4 w-4 text-neutral-400" />
                <span className="font-medium text-neutral-700">
                  {autoevaluacion?.nombre_comercio || 'Establecimiento'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Checklist de Autoevaluación
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-start">
              {!auth?.user && (
                <button
                  type="button"
                  onClick={() => setMostrarModalGuardar(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Guardar y vincular a mi cuenta</span>
                </button>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio
              </Link>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-neutral-600 border-t border-neutral-100 pt-4">
            Revise cada condición y declare la situación actual de su establecimiento. Esta autoevaluación tiene
            carácter orientativo y no reemplaza una inspección técnica oficial.
          </p>

          {/* Progreso Visual: Exclusivamente conteo descriptivo de completitud */}
          <div className="mt-5 flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3 border border-neutral-200">
            <div className="flex items-center gap-2 text-sm text-neutral-700 font-medium">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              <span>Avance de autoevaluación</span>
            </div>
            <div className="text-sm font-semibold text-neutral-900">
              {respondidosCount} de {criteriosAplicables.length} criterios respondidos
            </div>
          </div>
        </header>

        {/* Banner de Autoevaluación Registrada (Modo Solo Lectura) */}
        {esRegistrada && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-950 shadow-xs"
          >
            <Lock className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
            <div className="text-sm leading-relaxed">
              <strong className="font-bold text-emerald-950">Autoevaluación registrada: </strong>
              Esta autoevaluación está registrada y protegida contra modificaciones
              {autoevaluacion.registrada_at ? ` el ${autoevaluacion.registrada_at}` : ''}. Sus declaraciones permanecen inalterables. Se encuentra en modo de solo
              lectura. Para realizar modificaciones debe iniciar una reevaluación preventiva.
            </div>
          </div>
        )}

        {/* Notificaciones y Mensajes de Estado */}
        {mensajeExito && (
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="text-sm font-medium">{mensajeExito}</div>
            </div>
            {puedeVerResumen && (
              <Link
                href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
              >
                <span>Ver Resumen de Autoevaluación</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}

        {mensajeError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="text-sm font-medium">{mensajeError}</div>
          </div>
        )}

        {/* Acceso Rápido por Áreas Normativas */}
        {areas.length > 1 && (
          <nav aria-label="Navegación por áreas temáticas" className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-neutral-500 font-medium shrink-0">Áreas:</span>
            {areas.map((area) => {
              const respEnArea = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
              const AreaIcono = area.icono;
              return (
                <a
                  key={area.id}
                  href={`#area-${area.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 shrink-0 transition-colors shadow-2xs font-medium"
                >
                  <AreaIcono className="h-3.5 w-3.5 text-neutral-500" />
                  <span>{area.nombre}</span>
                  <span className="rounded-full bg-neutral-100 px-1.5 py-0.2 text-[10px] font-bold text-neutral-600">
                    {respEnArea}/{area.criterios.length}
                  </span>
                </a>
              );
            })}
          </nav>
        )}

        {/* Sección Informativa: Información Pendiente para Aplicabilidad */}
        {criteriosPendientes.length > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <button
              type="button"
              onClick={() => setMostrarPendientes(!mostrarPendientes)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2.5">
                <Info className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-semibold text-amber-900">
                  Información pendiente para determinar aplicabilidad ({criteriosPendientes.length})
                </h2>
              </div>
              {mostrarPendientes ? (
                <ChevronUp className="h-4 w-4 text-amber-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-700" />
              )}
            </button>

            {mostrarPendientes && (
              <div className="mt-3 space-y-3 border-t border-amber-200 pt-3">
                <p className="text-xs text-amber-800">
                  Los siguientes criterios requieren datos adicionales sobre las condiciones físicas del local para
                  determinar si corresponden a su autoevaluación. No requieren respuesta en este momento.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {criteriosPendientes.map((cp) => (
                    <div key={cp.codigo} className="rounded-lg border border-amber-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-900">{cp.codigo}</span>
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Pendiente de dato
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-neutral-800">{cp.titulo}</p>
                      <p className="mt-1 text-xs text-neutral-600">{cp.mensaje || cp.motivo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Lista de Criterios Aplicables Agrupados por Áreas Normativas */}
        <div className="space-y-10">
          {areas.map((area) => {
            const respEnArea = area.criterios.filter((c) => Boolean(respuestas[c.codigo])).length;
            const AreaIcono = area.icono;

            return (
              <section key={area.id} id={`area-${area.id}`} className="space-y-4 scroll-mt-20">
                {/* Encabezado del Área Temática */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-neutral-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-neutral-100 rounded-lg text-neutral-700">
                      <AreaIcono className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900">{area.nombre}</h2>
                  </div>
                  <div className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
                    {respEnArea} de {area.criterios.length} respondidos
                  </div>
                </div>

                {/* Tarjetas de Criterios del Área */}
                <div className="space-y-5">
                  {area.criterios.map((criterio, index) => {
                    const valorSeleccionado = respuestas[criterio.codigo];
                    const estaGuardado = criteriosGuardados[criterio.codigo];
                    const estaRespondido = Boolean(valorSeleccionado);
                    const tieneRecursos =
                      criterio.recursos_educativos && criterio.recursos_educativos.length > 0;

                    return (
                      <article
                        key={criterio.codigo}
                        id={`criterio-${criterio.codigo}`}
                        className={`rounded-xl border bg-white p-5 shadow-xs transition-colors ${
                          estaRespondido ? 'border-neutral-300' : 'border-neutral-200'
                        }`}
                      >
                        <fieldset className="space-y-4">
                          {/* Encabezado del Criterio: Identificadores y Estado */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-neutral-800">
                                {criterio.codigo}
                              </span>
                              {criterio.tipo_criterio && (
                                <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  {criterio.tipo_criterio}
                                </span>
                              )}
                              <span className="text-xs text-neutral-400">#{criterio.orden ?? index + 1}</span>
                            </div>

                            {/* Estado visual de la declaración */}
                            <div>
                              {estaGuardado ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                  <Check className="h-3 w-3" /> Guardado
                                </span>
                              ) : estaRespondido ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                                  Seleccionado
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                                  Sin responder
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Título y Pregunta Ciudadana (Nivel Primario) */}
                          <div>
                            <legend className="text-base font-bold text-neutral-900 leading-snug">
                              {criterio.titulo}
                            </legend>
                            <p className="mt-2 text-sm font-medium text-neutral-800 bg-neutral-50/80 p-3 rounded-lg border border-neutral-100 leading-relaxed">
                              {criterio.pregunta_ciudadana}
                            </p>
                          </div>

                          {/* Orientación Técnica: Qué observar (Nivel Contextual) */}
                          {criterio.que_observar && (
                            <div className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-700 border border-neutral-100">
                              <strong className="block text-neutral-800 mb-0.5 font-semibold">Qué observar:</strong>
                              <span className="leading-relaxed">{criterio.que_observar}</span>
                            </div>
                          )}

                          {/* Selector de Opciones Ciudadanas Autorizadas (Exclusivamente 3 opciones) */}
                          <div
                            role="radiogroup"
                            aria-label={`Opciones de respuesta para ${criterio.codigo}`}
                            className="grid gap-2.5 pt-1 sm:grid-cols-3"
                          >
                            {(criterio.opciones_respuesta || ['CUMPLE_DECLARADO', 'PENDIENTE_ATENDER', 'POR_REVISAR'])
                              .filter((op) => op !== 'NO_APLICA')
                              .map((opcionKey) => {
                                const conf = OPCIONES_ETIQUETAS[opcionKey] || {
                                  label: opcionKey,
                                  descripcion: '',
                                  icono: HelpCircle,
                                  borderSelected: 'border-neutral-600',
                                  bgSelected: 'bg-neutral-50',
                                  ringSelected: 'ring-1 ring-neutral-600',
                                  textSelected: 'text-neutral-900',
                                  iconSelected: 'text-neutral-600',
                                  radioAccent: 'text-neutral-600 focus:ring-neutral-500',
                                };
                                const Icono = conf.icono;
                                const esSeleccionado = valorSeleccionado === opcionKey;

                                return (
                                  <label
                                    key={opcionKey}
                                    htmlFor={`${criterio.codigo}-${opcionKey}`}
                                    className={`flex flex-col justify-between rounded-lg border p-3 text-left transition-all select-none ${
                                      esRegistrada ? 'cursor-default opacity-90' : 'cursor-pointer'
                                    } ${
                                      esSeleccionado
                                        ? `${conf.borderSelected} ${conf.bgSelected} ${conf.ringSelected} shadow-xs`
                                        : 'border-neutral-200 bg-white hover:bg-neutral-50/80 hover:border-neutral-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          id={`${criterio.codigo}-${opcionKey}`}
                                          name={`criterio-${criterio.codigo}`}
                                          value={opcionKey}
                                          checked={esSeleccionado}
                                          disabled={esRegistrada || guardandoAvance || guardandoContinuar}
                                          onChange={() => seleccionarRespuesta(criterio.codigo, opcionKey)}
                                          className={`h-4 w-4 border-neutral-300 ${conf.radioAccent} disabled:opacity-60`}
                                        />
                                        <span
                                          className={`text-xs font-semibold ${
                                            esSeleccionado ? conf.textSelected : 'text-neutral-800'
                                          }`}
                                        >
                                          {conf.label}
                                        </span>
                                      </div>
                                      <Icono
                                        className={`h-4 w-4 shrink-0 ${
                                          esSeleccionado ? conf.iconSelected : 'text-neutral-400'
                                        }`}
                                      />
                                    </div>
                                    <span className="mt-1.5 text-[11px] text-neutral-500 leading-tight">
                                      {conf.descripcion}
                                    </span>
                                  </label>
                                );
                              })}
                          </div>

                          {/* Acción Orientativa de Mejora (Jerarquía Dinámica) */}
                          {criterio.accion_mejora_orientativa && (
                            <>
                              {valorSeleccionado === 'PENDIENTE_ATENDER' || valorSeleccionado === 'POR_REVISAR' ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 animate-in fade-in">
                                  <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-900">
                                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span>Acción orientativa recomendada:</span>
                                  </div>
                                  <p className="leading-relaxed">{criterio.accion_mejora_orientativa}</p>
                                </div>
                              ) : !valorSeleccionado ? (
                                <details className="text-xs text-neutral-500 group">
                                  <summary className="cursor-pointer text-[11px] font-medium text-neutral-600 hover:text-neutral-900">
                                    Ver acción orientativa preventiva recomendada si no cuenta con esta condición...
                                  </summary>
                                  <div className="mt-1.5 rounded-lg bg-neutral-50 p-2.5 text-neutral-700 border border-neutral-100">
                                    {criterio.accion_mejora_orientativa}
                                  </div>
                                </details>
                              ) : null}
                            </>
                          )}

                          {/* Recursos Educativos Orientativos Complementarios */}
                          {tieneRecursos && (
                            <div className="pt-0.5">
                              {valorSeleccionado === 'PENDIENTE_ATENDER' || valorSeleccionado === 'POR_REVISAR' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalRecurso({
                                      isOpen: true,
                                      recursos: criterio.recursos_educativos || [],
                                      codigo: criterio.codigo,
                                      titulo: criterio.titulo,
                                    })
                                  }
                                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-900 shadow-2xs hover:bg-blue-100 hover:border-blue-400 transition-colors cursor-pointer"
                                >
                                  <BookOpen className="h-4 w-4 text-blue-700" />
                                  <span>
                                    Ver material orientativo complementario{' '}
                                    {criterio.recursos_educativos && criterio.recursos_educativos.length > 1
                                      ? `(${criterio.recursos_educativos.length})`
                                      : ''}
                                  </span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalRecurso({
                                      isOpen: true,
                                      recursos: criterio.recursos_educativos || [],
                                      codigo: criterio.codigo,
                                      titulo: criterio.titulo,
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-700 transition-colors cursor-pointer"
                                >
                                  <BookOpen className="h-3.5 w-3.5 text-neutral-400" />
                                  <span>
                                    Material orientativo{' '}
                                    {criterio.recursos_educativos && criterio.recursos_educativos.length > 1
                                      ? `(${criterio.recursos_educativos.length})`
                                      : ''}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Apunte Personal Ciudadano (Opcional, max: 1000) */}
                          <div className="pt-2 border-t border-neutral-100">
                            {!mostrarNotas[criterio.codigo] && !notas[criterio.codigo] ? (
                              <button
                                type="button"
                                onClick={() => setMostrarNotas((prev) => ({ ...prev, [criterio.codigo]: true }))}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                              >
                                <FileEdit className="h-3.5 w-3.5 text-neutral-400" />
                                <span>Añadir apunte personal (opcional)</span>
                              </button>
                            ) : (
                              <div className="space-y-1.5 rounded-lg bg-neutral-50/70 p-3 border border-neutral-200">
                                <div className="flex items-center justify-between text-xs">
                                  <label
                                    htmlFor={`notas-${criterio.codigo}`}
                                    className="font-medium text-neutral-700 flex items-center gap-1.5"
                                  >
                                    <FileEdit className="h-3.5 w-3.5 text-neutral-500" />
                                    <span>Apunte personal privado:</span>
                                  </label>
                                  <span className="text-[11px] text-neutral-500 font-mono">
                                    {(notas[criterio.codigo] || '').length}/1000
                                  </span>
                                </div>
                                <textarea
                                  id={`notas-${criterio.codigo}`}
                                  value={notas[criterio.codigo] || ''}
                                  maxLength={1000}
                                  disabled={esRegistrada || guardandoAvance || guardandoContinuar}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setNotas((prev) => ({ ...prev, [criterio.codigo]: val }));
                                    setCriteriosGuardados((prev) => ({ ...prev, [criterio.codigo]: false }));
                                  }}
                                  placeholder="Escriba un recordatorio personal para esta condición (ej. consultar con el técnico, comprar repuesto, revisar fecha)..."
                                  rows={2}
                                  className="w-full rounded-md border border-neutral-200 bg-white p-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-neutral-100 disabled:opacity-75 resize-y"
                                />
                                <p className="text-[10px] text-neutral-500 leading-normal">
                                  Este apunte es privado para su propia organización preventiva y no constituye un informe
                                  técnico oficial.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Referencia Normativa Informativa (Nivel Secundario) */}
                          {criterio.norma_base && (
                            <div className="text-[11px] text-neutral-400 pt-0.5">
                              <span>Referencia: {criterio.norma_base}</span>
                              {criterio.articulo_referencia && <span> ({criterio.articulo_referencia})</span>}
                            </div>
                          )}
                        </fieldset>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Sección Informativa: Criterios No Aplicables (Solo lectura) */}
        {criteriosNoAplican.length > 0 && (
          <section className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5">
            <button
              type="button"
              onClick={() => setMostrarNoAplican(!mostrarNoAplican)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-neutral-400" />
                <h2 className="text-base font-semibold text-neutral-800">
                  Criterios determinados por el sistema como no aplicables ({criteriosNoAplican.length})
                </h2>
              </div>
              {mostrarNoAplican ? (
                <ChevronUp className="h-4 w-4 text-neutral-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-neutral-500" />
              )}
            </button>

            {mostrarNoAplican && (
              <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3">
                <p className="text-xs text-neutral-500">
                  Las siguientes condiciones no corresponden a su establecimiento de acuerdo a las características
                  físicas declaradas en el registro inicial. No son seleccionables ni requieren acción ciudadana.
                </p>
                <div className="space-y-2">
                  {criteriosNoAplican.map((cna) => (
                    <div key={cna.codigo} className="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-800">{cna.codigo}</span>
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-600 border border-neutral-200">
                          No aplica
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-neutral-800">{cna.titulo}</p>
                      <p className="mt-1 text-xs text-neutral-600 bg-neutral-50 p-2 rounded border border-neutral-100">
                        <strong className="text-neutral-700">Motivo del sistema: </strong>
                        {cna.motivo}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Barra de Acciones Fija Inferior (Ergonomía móvil ≤ 72px) */}
      <div className="sticky bottom-2 sm:bottom-4 z-20 mx-auto max-w-4xl px-2 sm:px-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4 rounded-xl sm:rounded-2xl border border-neutral-200 bg-white/95 px-3 py-2.5 sm:px-5 sm:py-3 shadow-lg backdrop-blur-md min-h-[56px] max-h-[72px]">
          {/* Conteo descriptivo de avance */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-neutral-600 truncate">
            <ClipboardList className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="font-bold text-neutral-900 truncate">
              {respondidosCount} de {criteriosAplicables.length} respondidos
            </span>
            {respondidosCount < criteriosAplicables.length && !esRegistrada && (
              <span className="hidden md:inline text-amber-700">
                (Faltan {criteriosAplicables.length - respondidosCount})
              </span>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Acción Secundaria: Guardar Avance */}
            {!esRegistrada && (
              <button
                type="button"
                onClick={handleGuardarAvance}
                disabled={guardandoAvance || guardandoContinuar || respondidosCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {guardandoAvance ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-600 border-t-transparent" />
                ) : (
                  <Save className="h-3.5 w-3.5 text-neutral-600" />
                )}
                <span className="hidden xs:inline">Guardar avance</span>
                <span className="xs:hidden">Guardar</span>
              </button>
            )}

            {/* Acción Principal: Continuar al Resumen */}
            {esRegistrada ? (
              <Link
                href={`/autoevaluacion/${autoevaluacion.uuid}/resumen`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
              >
                <span>Ver Resumen</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleContinuarAlResumen}
                disabled={guardandoAvance || guardandoContinuar || !todosRespondidos}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors ${
                  todosRespondidos
                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer'
                    : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                }`}
              >
                {guardandoContinuar ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Continuando...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar al resumen</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <ModalGuardarProgreso
        isOpen={mostrarModalGuardar}
        onClose={() => setMostrarModalGuardar(false)}
        uuid={autoevaluacion?.uuid}
        establecimiento={autoevaluacion?.nombre_comercio}
        destino="checklist"
      />

      <RecursoEducativoModal
        isOpen={modalRecurso.isOpen}
        onClose={() => setModalRecurso({ isOpen: false, recursos: [] })}
        recursos={modalRecurso.recursos}
        criterioCodigo={modalRecurso.codigo}
        criterioTitulo={modalRecurso.titulo}
      />
    </>
  );
}
