import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
  Building2,
  BookOpen,
  Info,
  Home,
  RotateCcw,
  Lock,
  Check,
  Loader2,
  AlertTriangle,
  X,
  Save,
  Printer,
  RefreshCw,
  Copy,
} from 'lucide-react';

import type {
    FinalizarPendiente,
    ResumenProps,
} from '@/types/contrato';

export default function Resumen({
  autoevaluacion,
  resumen,
  pendiente_atender = [],
  por_revisar = [],
  cumple_declarado = [],
  no_aplica = [],
}: ResumenProps) {
  const { auth } = usePage().props as { auth?: { user: any | null } };
  const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState<boolean>(false);
  const [modalRecurso, setModalRecurso] = useState<{
    isOpen: boolean;
    recursos: RecursoEducativoData[];
    codigo?: string;
    titulo?: string;
  }>({
    isOpen: false,
    recursos: [],
  });
  const [finalizando, setFinalizando] = useState<boolean>(false);
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null);
  const [pendientesFinalizar, setPendientesFinalizar] = useState<FinalizarPendiente[]>([]);
  const [copiado, setCopiado] = useState<boolean>(false);

  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!mostrarModalConfirmacion) return;

    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!finalizando) {
          setMostrarModalConfirmacion(false);
          setErrorFinalizar(null);
        }
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    };
  }, [mostrarModalConfirmacion, finalizando]);

  const esRegistrada = autoevaluacion?.estado === 'REGISTRADA';

  const copiarHash = () => {
    if (!autoevaluacion?.hash_integridad) return;
    navigator.clipboard.writeText(autoevaluacion.hash_integridad);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    setErrorFinalizar(null);
    setPendientesFinalizar([]);

    try {
      // El cierre se pide con fetch y no con router.post a propósito: Inertia
      // fuerza el encabezado Accept a "text/html, application/xhtml+xml" en su
      // cliente, por lo que el backend nunca ve wantsJson() y respondería con un
      // 302 ciego. Además, un 422 JSON plano no es una respuesta Inertia válida y
      // su único recurso de reproducción es el modal de error a pantalla
      // completa. Con fetch leemos el contrato 422 completo y mostramos la lista
      // de pendientes en lugar de rebotar al usuario sin explicación.
      const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch(`/autoevaluacion/${autoevaluacion.uuid}/finalizar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      });

      if (response.ok) {
        setMostrarModalConfirmacion(false);
        router.reload();
        return;
      }

      if (response.status === 422) {
        const data = await response.json().catch(() => null);
        setErrorFinalizar(
          data?.mensaje ??
            'No es posible registrar la autoevaluación porque existen condiciones aplicables sin declaración.'
        );
        setPendientesFinalizar(Array.isArray(data?.pendientes) ? data.pendientes : []);
        return;
      }

      const data = await response.json().catch(() => null);
      setErrorFinalizar(
        data?.mensaje ??
          (response.status === 409
            ? 'Esta autoevaluación ya se encuentra registrada y protegida contra modificaciones.'
            : 'No fue posible registrar la autoevaluación. Intente nuevamente.')
      );
    } catch {
      setErrorFinalizar(
        'No fue posible registrar la autoevaluación. Verifique su conexión e intente nuevamente.'
      );
    } finally {
      setFinalizando(false);
    }
  };

  return (
    <>
      <Head title="Resumen de Autoevaluación - CheckITSE Huancayo" />

      <div className="mx-auto max-w-4xl space-y-8 pb-16 print:max-w-none print:p-0 print:space-y-4 print:pb-0">
        {/* ========================================================================= */}
        {/* ENCABEZADO EXCLUSIVO PARA IMPRESIÓN */}
        {/* ========================================================================= */}
        <div className="hidden print:block mb-4 border-b border-neutral-300 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-tight text-neutral-900">
                RESUMEN PREVENTIVO DE AUTOEVALUACIÓN CÍVICA
              </h1>
              <p className="text-xs text-neutral-600 font-medium">
                Herramienta Ciudadana de Prevención y Orientación Técnica — CheckITSE Huancayo
              </p>
            </div>
            {autoevaluacion.registrada_at && (
              <div className="text-right text-xs text-neutral-700">
                <span className="font-semibold">Fecha y hora de registro:</span>
                <br />
                {autoevaluacion.registrada_at}
              </div>
            )}
          </div>

          {/* Ficha del Establecimiento en Impresión */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-neutral-200 pt-2">
            <div>
              <span className="font-semibold text-neutral-700">Establecimiento: </span>
              <span className="text-neutral-900">{autoevaluacion?.nombre_comercio || 'No declarado'}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-700">Giro o Actividad: </span>
              <span className="text-neutral-900">{autoevaluacion?.funcion_economica || 'No declarada'}</span>
            </div>
            {autoevaluacion?.ruc && (
              <div>
                <span className="font-semibold text-neutral-700">RUC: </span>
                <span className="font-mono text-neutral-900">{autoevaluacion.ruc}</span>
              </div>
            )}
            {autoevaluacion?.direccion && (
              <div>
                <span className="font-semibold text-neutral-700">Dirección: </span>
                <span className="text-neutral-900">{autoevaluacion.direccion}</span>
              </div>
            )}
            {autoevaluacion?.codigo_acceso && (
              <div>
                <span className="font-semibold text-neutral-700">Código de acceso CheckITSE: </span>
                <span className="font-mono font-bold text-neutral-900">{autoevaluacion.codigo_acceso}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-neutral-700">Estado: </span>
              <span className="font-medium text-neutral-900">{esRegistrada ? 'REGISTRADA (Protegida contra modificaciones)' : 'INICIADA (En edición)'}</span>
            </div>
          </div>
        </div>

        {/* DESLINDE EXCLUSIVO PARA IMPRESIÓN */}
        <div className="hidden print:block mb-4 rounded border border-neutral-400 p-3 text-[10.5px] text-neutral-800 leading-relaxed bg-white">
          <p className="font-bold uppercase mb-1 text-black">
            DECLARACIÓN CIUDADANA PREVENTIVA — NO CONSTITUYE INSPECCIÓN MUNICIPAL
          </p>
          <p>
            Este documento refleja única y exclusivamente las condiciones de seguridad declaradas por el responsable del establecimiento a través de la plataforma comunitaria CheckITSE Huancayo. No acredita el cumplimiento de la normativa ITSE, no otorga autorización, licencia ni habilitación municipal alguna, y no reemplaza la inspección técnica oficial que corresponde a los órganos competentes de la Municipalidad Provincial de Huancayo.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* ENCABEZADO PARA PANTALLA (Oculto en Impresión) */}
        {/* ========================================================================= */}
        <header className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
                <Building2 className="h-4 w-4 text-neutral-400 shrink-0" />
                <span className="font-semibold text-neutral-900">
                  {autoevaluacion?.nombre_comercio || 'Establecimiento'}
                </span>
                <span>•</span>
                <span>
                  <strong className="font-medium text-neutral-500">Giro o Actividad:</strong>{' '}
                  <span className="text-neutral-800">{autoevaluacion?.funcion_economica || 'No declarada'}</span>
                </span>
                {autoevaluacion?.ruc && (
                  <>
                    <span>•</span>
                    <span>
                      <strong className="font-medium text-neutral-500">RUC:</strong>{' '}
                      <span className="font-mono text-neutral-800">{autoevaluacion.ruc}</span>
                    </span>
                  </>
                )}
                {autoevaluacion?.direccion && (
                  <>
                    <span>•</span>
                    <span>
                      <strong className="font-medium text-neutral-500">Dirección:</strong>{' '}
                      <span className="text-neutral-800">{autoevaluacion.direccion}</span>
                    </span>
                  </>
                )}
                {autoevaluacion?.codigo_acceso && (
                  <>
                    <span>•</span>
                    <span>
                      <strong className="font-medium text-neutral-500">Código de acceso CheckITSE:</strong>{' '}
                      <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded text-xs">{autoevaluacion.codigo_acceso}</span>
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                Resumen de Autoevaluación
              </h1>

              {/* Badge de Estado del Ciclo de Vida */}
              {esRegistrada ? (
                <div className="pt-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      <Lock className="h-3.5 w-3.5 text-emerald-700" />
                      Autoevaluación registrada
                    </span>
                    {autoevaluacion.registrada_at && (
                      <span className="text-xs text-neutral-500 font-medium">
                        Registrada el {autoevaluacion.registrada_at}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    En proceso de autoevaluación (Edición abierta)
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-start">
              {!auth?.user && (
                <button
                  type="button"
                  onClick={() => setMostrarModalGuardar(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 transition shadow-2xs"
                >
                  <Save className="h-3.5 w-3.5 text-primary-600" />
                  <span>Guardar y vincular a mi cuenta</span>
                </button>
              )}
              {auth?.user && (
                <Link
                  href="/mis-autoevaluaciones"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Mis autoevaluaciones</span>
                </Link>
              )}
              {esRegistrada && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Imprimir / PDF</span>
                </button>
              )}
              <Link
                href={`/autoevaluacion/${autoevaluacion.uuid}/checklist`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-neutral-500" />
                {esRegistrada ? 'Ver en checklist (lectura)' : 'Modificar en checklist'}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <Home className="h-3.5 w-3.5 text-neutral-500" />
                Inicio
              </Link>
            </div>
          </div>

          {/* Aviso Institucional Preventivo Obligatorio */}
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 leading-relaxed">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <strong className="font-semibold text-blue-950">Aviso importante: </strong>
                Este resumen tiene carácter preventivo y orientativo. Presenta únicamente las declaraciones
                realizadas por el ciudadano y la información determinada por el sistema. No constituye una
                inspección técnica, certificación ITSE, aprobación, desaprobación ni clasificación oficial de riesgo.
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SECCIÓN: CONTEOS DESCRIPTIVOS (Números absolutos) */}
        {/* ========================================================================= */}
        <section aria-labelledby="conteos-descriptivos-title">
          <h2 id="conteos-descriptivos-title" className="sr-only">
            Conteos descriptivos de la autoevaluación
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5 print:gap-2">
            {/* 1. Condiciones Aplicables */}
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs print:border-neutral-300 print:shadow-none print:p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <ClipboardList className="h-4 w-4 text-neutral-400 print:hidden" />
                <span>Condiciones aplicables</span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 print:text-xl">
                {resumen.total_criterios_aplicables}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Evaluadas en su local</p>
            </div>

            {/* 2. Declaradas Cumplidas */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs print:border-neutral-300 print:bg-white print:shadow-none print:p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 print:text-neutral-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 print:hidden" />
                <span>Declaradas cumplidas</span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 print:text-xl print:text-neutral-900">
                {resumen.total_cumple_declarado}
              </div>
              <p className="mt-1 text-[11px] text-emerald-700 print:text-neutral-500">Declaración ciudadana</p>
            </div>

            {/* 3. Pendientes de Atender */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs print:border-neutral-300 print:bg-white print:shadow-none print:p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-800 print:text-neutral-700">
                <Clock className="h-4 w-4 text-amber-600 print:hidden" />
                <span>Pendientes de atender</span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-amber-950 print:text-xl print:text-neutral-900">
                {resumen.total_pendiente_atender}
              </div>
              <p className="mt-1 text-[11px] text-amber-700 print:text-neutral-500">Atención preventiva</p>
            </div>

            {/* 4. Por Revisar */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 shadow-2xs print:border-neutral-300 print:bg-white print:shadow-none print:p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-sky-800 print:text-neutral-700">
                <HelpCircle className="h-4 w-4 text-sky-600 print:hidden" />
                <span>Por revisar</span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-sky-950 print:text-xl print:text-neutral-900">
                {resumen.total_por_revisar}
              </div>
              <p className="mt-1 text-[11px] text-sky-700 print:text-neutral-500">Revisión adicional</p>
            </div>

            {/* 5. Determinadas No Aplican */}
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 shadow-2xs print:border-neutral-300 print:bg-white print:shadow-none print:p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <ShieldAlert className="h-4 w-4 text-neutral-400 print:hidden" />
                <span>No aplicables</span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-700 print:text-xl print:text-neutral-900">
                {resumen.total_no_aplica}
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">Regla del sistema</p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 1 — ASPECTOS QUE REQUIEREN ATENCIÓN PREVENTIVA */}
        {/* ========================================================================= */}
        <section className="space-y-4 print:space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-5 print:border-neutral-300 print:bg-white print:p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 print:hidden">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Aspectos que requieren atención preventiva ({pendiente_atender.length})
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Condiciones que usted indicó que requieren atención preventiva en su establecimiento.
                  Consulte las orientaciones sugeridas para atenderlas de forma preventiva.
                </p>
              </div>
            </div>

            {pendiente_atender.length === 0 ? (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 print:p-2 print:text-xs">
                No declaró aspectos pendientes de atención preventiva.
              </div>
            ) : (
              <div className="mt-4 space-y-3 print:space-y-2.5">
                {pendiente_atender.map((item) => (
                  <div
                    key={item.codigo}
                    className="rounded-lg border border-amber-200 bg-white p-4 shadow-2xs space-y-3 print:border-neutral-300 print:shadow-none print:p-3 print:break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5 print:pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          {item.codigo}
                        </span>
                        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 print:text-neutral-800 print:bg-neutral-100 print:border-neutral-300">
                          Aspecto declarado como pendiente de atención
                        </span>
                      </div>
                      {(item.norma_base || item.articulo_referencia) && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <BookOpen className="h-3.5 w-3.5 text-neutral-400 print:hidden" />
                          <span>
                            {item.norma_base}
                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-neutral-900">{item.titulo}</h3>

                    {item.que_observar && (
                      <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-700 border border-neutral-100 print:bg-white print:border-neutral-200 print:p-2">
                        <strong className="text-neutral-900 font-medium">Qué observar en el establecimiento: </strong>
                        {item.que_observar}
                      </div>
                    )}

                    {item.accion_mejora_orientativa && (
                      <div className="rounded-md bg-amber-50/60 p-3 text-xs text-amber-900 border border-amber-200/60 print:bg-white print:border-neutral-300 print:text-neutral-900 print:p-2">
                        <strong className="font-semibold text-amber-950 print:text-neutral-900">Orientación de atención preventiva: </strong>
                        {item.accion_mejora_orientativa}
                      </div>
                    )}

                    {/* Nota personal del ciudadano cuando existe */}
                    {item.notas && item.notas.trim().length > 0 && (
                      <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-800 border border-neutral-200 print:bg-white print:p-2">
                        <strong className="text-neutral-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                          Nota personal del comerciante:
                        </strong>
                        <p className="whitespace-pre-line text-neutral-700 italic">
                          {item.notas.trim()}
                        </p>
                      </div>
                    )}

                    {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-md bg-amber-50/80 p-3 text-xs border border-amber-200 print:hidden">
                        <div className="flex items-center gap-2 text-amber-900 font-medium">
                          <BookOpen className="h-4 w-4 shrink-0 text-amber-700" />
                          <span>Material pedagógico y orientaciones de prevención:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setModalRecurso({
                              isOpen: true,
                              recursos: item.recursos_educativos || [],
                              codigo: item.codigo,
                              titulo: item.titulo,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 font-semibold text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-100/60 transition-colors cursor-pointer shrink-0"
                        >
                          <span>Consultar material complementario</span>
                          {item.recursos_educativos.length > 1 && (
                            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold">
                              {item.recursos_educativos.length}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 2 — ASPECTOS POR REVISAR O INDAGAR */}
        {/* ========================================================================= */}
        <section className="space-y-4 print:space-y-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-5 print:border-neutral-300 print:bg-white print:p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-800 print:hidden">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Aspectos por revisar o indagar ({por_revisar.length})
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Una declaración de "Por revisar" no significa incumplimiento ni infracción; refleja que usted
                  considera necesario realizar una verificación adicional o consultar con personal técnico competente.
                </p>
              </div>
            </div>

            {por_revisar.length === 0 ? (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 print:p-2 print:text-xs">
                No declaró aspectos con revisión pendiente.
              </div>
            ) : (
              <div className="mt-4 space-y-3 print:space-y-2.5">
                {por_revisar.map((item) => (
                  <div
                    key={item.codigo}
                    className="rounded-lg border border-sky-200 bg-white p-4 shadow-2xs space-y-3 print:border-neutral-300 print:shadow-none print:p-3 print:break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2.5 print:pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          {item.codigo}
                        </span>
                        <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200 print:text-neutral-800 print:bg-neutral-100 print:border-neutral-300">
                          Revisión adicional pendiente
                        </span>
                      </div>
                      {(item.norma_base || item.articulo_referencia) && (
                        <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <BookOpen className="h-3.5 w-3.5 text-neutral-400 print:hidden" />
                          <span>
                            {item.norma_base}
                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-neutral-900">{item.titulo}</h3>

                    {item.que_observar && (
                      <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-700 border border-neutral-100 print:bg-white print:border-neutral-200 print:p-2">
                        <strong className="text-neutral-900 font-medium">Condición a verificar: </strong>
                        {item.que_observar}
                      </div>
                    )}

                    {item.orientacion && (
                      <div className="rounded-md bg-sky-50/60 p-3 text-xs text-sky-900 border border-sky-200/60 print:bg-white print:border-neutral-300 print:text-neutral-900 print:p-2">
                        <strong className="font-semibold text-sky-950 print:text-neutral-900">Orientación para la revisión: </strong>
                        {item.orientacion}
                      </div>
                    )}

                    {/* Nota personal del ciudadano cuando existe */}
                    {item.notas && item.notas.trim().length > 0 && (
                      <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-800 border border-neutral-200 print:bg-white print:p-2">
                        <strong className="text-neutral-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                          Nota personal del comerciante:
                        </strong>
                        <p className="whitespace-pre-line text-neutral-700 italic">
                          {item.notas.trim()}
                        </p>
                      </div>
                    )}

                    {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-md bg-sky-50/80 p-3 text-xs border border-sky-200 print:hidden">
                        <div className="flex items-center gap-2 text-sky-900 font-medium">
                          <BookOpen className="h-4 w-4 shrink-0 text-sky-700" />
                          <span>Orientación técnica recomendada para la verificación:</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setModalRecurso({
                              isOpen: true,
                              recursos: item.recursos_educativos || [],
                              codigo: item.codigo,
                              titulo: item.titulo,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 font-semibold text-sky-900 border border-sky-300 shadow-2xs hover:bg-sky-100/60 transition-colors cursor-pointer shrink-0"
                        >
                          <span>Consultar material técnico</span>
                          {item.recursos_educativos.length > 1 && (
                            <span className="rounded-full bg-sky-200 px-1.5 py-0.2 text-[10px] font-bold">
                              {item.recursos_educativos.length}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 3 — CONDICIONES DECLARADAS CUMPLIDAS */}
        {/* ========================================================================= */}
        <section className="space-y-4 print:space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-5 print:border-neutral-300 print:bg-white print:p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 print:hidden">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Condiciones declaradas como cumplidas ({cumple_declarado.length})
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Condiciones que usted declaró cumplir según su propia observación. Esta declaración tiene carácter
                  cívico y no representa una comprobación física oficial.
                </p>
              </div>
            </div>

            {cumple_declarado.length === 0 ? (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 print:p-2 print:text-xs">
                No registró condiciones con cumplimiento declarado.
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 print:space-y-2">
                {cumple_declarado.map((item) => (
                  <div
                    key={item.codigo}
                    className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3.5 shadow-2xs print:border-neutral-300 print:shadow-none print:p-2.5 print:break-inside-avoid"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                            {item.codigo}
                          </span>
                          <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 print:text-neutral-800 print:bg-neutral-100 print:border-neutral-300">
                            Declarado por el ciudadano como cumplido
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-neutral-800">{item.titulo}</p>
                      </div>

                      <div className="flex items-center gap-3 sm:self-center shrink-0">
                        {(item.norma_base || item.articulo_referencia) && (
                          <span className="text-[11px] text-neutral-400">
                            {item.norma_base}
                            {item.articulo_referencia && ` (${item.articulo_referencia})`}
                          </span>
                        )}
                        {item.recursos_educativos && item.recursos_educativos.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalRecurso({
                                isOpen: true,
                                recursos: item.recursos_educativos || [],
                                codigo: item.codigo,
                                titulo: item.titulo,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer print:hidden"
                          >
                            <BookOpen className="h-3 w-3" />
                            <span>Consultar guía</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Nota personal del ciudadano cuando existe */}
                    {item.notas && item.notas.trim().length > 0 && (
                      <div className="mt-1 rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-800 border border-neutral-200 print:bg-white print:p-2">
                        <strong className="text-neutral-700 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
                          Nota personal del comerciante:
                        </strong>
                        <p className="whitespace-pre-line text-neutral-700 italic">
                          {item.notas.trim()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 4 — CONDICIONES DETERMINADAS COMO NO APLICABLES */}
        {/* ========================================================================= */}
        <section className="space-y-4 print:space-y-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-5 print:border-neutral-300 print:bg-white print:p-3">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-700 print:hidden">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-neutral-900">
                  Condiciones determinadas como no aplicables ({no_aplica.length})
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Criterios determinados automáticamente por las reglas del sistema a partir de las características
                  físicas declaradas (p. ej., no usar GLP, no contar con equipos de cocción con aceites o escaleras).
                  Este estado es asignado por el motor normativo y no es seleccionable por el ciudadano.
                </p>
              </div>
            </div>

            {no_aplica.length === 0 ? (
              <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 text-center text-sm text-neutral-500 print:p-2 print:text-xs">
                Todas las condiciones activas aplican a las características de su establecimiento.
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 print:space-y-2">
                {no_aplica.map((item) => (
                  <div
                    key={item.codigo}
                    className="rounded-lg border border-neutral-200 bg-white p-3.5 shadow-2xs space-y-2 print:border-neutral-300 print:shadow-none print:p-2.5 print:break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                          {item.codigo}
                        </span>
                        <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200 print:border-neutral-300">
                          No aplicable (motor técnico)
                        </span>
                      </div>
                      {(item.norma_base || item.articulo_referencia) && (
                        <span className="text-[11px] text-neutral-400">
                          {item.norma_base}
                          {item.articulo_referencia && ` (${item.articulo_referencia})`}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-neutral-800">{item.titulo}</p>

                    <div className="rounded-md bg-neutral-50 p-2.5 text-xs text-neutral-600 border border-neutral-100 print:bg-white print:border-neutral-200 print:p-2">
                      <strong className="text-neutral-700">Fundamento técnico del sistema: </strong>
                      {item.motivo}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 9 — VERIFICACIÓN DE INTEGRIDAD TÉCNICA (Solo para REGISTRADA) */}
        {/* ========================================================================= */}
        {esRegistrada && autoevaluacion.hash_integridad && (
          <section
            aria-labelledby="integridad-tecnica-title"
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs print:border-neutral-300 print:shadow-none print:break-inside-avoid"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-neutral-500" />
              <h2 id="integridad-tecnica-title" className="text-sm font-bold text-neutral-900">
                Verificación de Integridad Técnica
              </h2>
            </div>
            <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
              Verificación de integridad técnica (SHA-256): este código permite comprobar técnicamente si el contenido registrado coincide con la declaración original. No constituye acreditación ni certificación municipal.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 rounded-lg bg-neutral-50 px-3.5 py-2.5 border border-neutral-200 font-mono text-[11px] text-neutral-800 break-all select-all print:bg-white print:border-neutral-300">
                {autoevaluacion.hash_integridad}
              </div>
              <button
                type="button"
                onClick={copiarHash}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors shrink-0 print:hidden cursor-pointer"
              >
                {copiado ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-neutral-500" />
                    <span>Copiar código</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 10 — BARRA DE ACCIONES FINAL (Oculta en Impresión) */}
        {/* ========================================================================= */}
        <footer className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 text-center sm:text-left">
              {esRegistrada
                ? 'Esta autoevaluación se encuentra registrada y protegida contra modificaciones. Sus declaraciones permanecen inalterables.'
                : 'Puede revisar y ajustar sus declaraciones antes de confirmar y registrar la autoevaluación definitiva.'}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
              {/* Botón Guardar en cuenta (solo para invitados) */}
              {!auth?.user && (
                <button
                  type="button"
                  onClick={() => setMostrarModalGuardar(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary-300 bg-primary-50 px-4 py-2.5 text-xs font-bold text-primary-700 shadow-2xs hover:bg-primary-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors w-full sm:w-auto cursor-pointer"
                >
                  <Save className="h-4 w-4 text-primary-600" />
                  <span>Guardar y vincular a mi cuenta</span>
                </button>
              )}

              {/* Botón Ver mis autoevaluaciones (solo para usuarios autenticados) */}
              {auth?.user && (
                <Link
                  href="/mis-autoevaluaciones"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto"
                >
                  <Building2 className="h-4 w-4 text-neutral-500" />
                  <span>Ver mis autoevaluaciones</span>
                </Link>
              )}

              {/* Botón Checklist: Ver o Modificar */}
              <Link
                href={`/autoevaluacion/${autoevaluacion.uuid}/checklist`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4 text-neutral-500" />
                <span>{esRegistrada ? 'Ver en checklist (lectura)' : 'Modificar en checklist'}</span>
              </Link>

              {/* En REGISTRADA: Botón de Impresión */}
              {esRegistrada && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 shadow-2xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 transition-colors w-full sm:w-auto cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-neutral-600" />
                  <span>Imprimir resumen preventivo / Guardar PDF</span>
                </button>
              )}

              {/* En INICIADA: Botón Registrar */}
              {!esRegistrada && (
                <button
                  type="button"
                  onClick={(e) => {
                    triggerRef.current = e.currentTarget;
                    setErrorFinalizar(null);
                    setMostrarModalConfirmacion(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors w-full sm:w-auto cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirmar y registrar autoevaluación</span>
                </button>
              )}
            </div>
          </div>

          {/* En REGISTRADA: Acción Primaria de Reevaluación Preventiva con bloque contextual */}
          {esRegistrada && (
            <div className="border-t border-neutral-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-primary-50/40 -mx-5 -mb-5 p-5 rounded-b-xl">
              <div className="text-xs text-neutral-600 max-w-xl text-center sm:text-left leading-relaxed">
                <span className="font-semibold text-neutral-800 block mb-0.5">
                  ¿Realizó mejoras en su establecimiento o desea actualizar sus declaraciones?
                </span>
                Inicia una nueva autoevaluación tomando los datos de este local como referencia para evaluar mejoras o cambios. Tu autoevaluación anterior permanecerá inalterable en tu historial.
              </div>
              <Link
                href={`/autoevaluacion/reevaluar/${autoevaluacion.uuid}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-primary-700 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors w-full sm:w-auto shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Iniciar nueva autoevaluación preventiva</span>
              </Link>
            </div>
          )}
        </footer>

        {/* Modal de Confirmación de Cierre */}
        {mostrarModalConfirmacion && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-confirmar-titulo"
          >
            <div ref={modalRef} className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="modal-confirmar-titulo" className="text-lg font-bold text-neutral-900">
                      Confirmar y registrar autoevaluación
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Paso final para el cierre formal del registro
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!finalizando) {
                      setMostrarModalConfirmacion(false);
                      setErrorFinalizar(null);
                    }
                  }}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                  disabled={finalizando}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="font-semibold text-amber-950">
                    Atención: acción definitiva e inmutable
                  </p>
                </div>
                <p className="leading-relaxed">
                  Al registrar la autoevaluación, las declaraciones quedarán guardadas como una versión cerrada y ya no podrán modificarse. Si posteriormente desea realizar cambios, deberá iniciar una reevaluación.
                </p>
              </div>

              {errorFinalizar && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p>{errorFinalizar}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={() => {
                    setMostrarModalConfirmacion(false);
                    setErrorFinalizar(null);
                  }}
                  disabled={finalizando}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={finalizando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {finalizando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirmar registro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalGuardarProgreso
        isOpen={mostrarModalGuardar}
        onClose={() => setMostrarModalGuardar(false)}
        uuid={autoevaluacion?.uuid}
        establecimiento={autoevaluacion?.nombre_comercio}
        destino="resumen"
      />

      <RecursoEducativoModal
        isOpen={modalRecurso.isOpen}
        onClose={() => setModalRecurso((prev) => ({ ...prev, isOpen: false }))}
        recursos={modalRecurso.recursos}
        criterioCodigo={modalRecurso.codigo}
        criterioTitulo={modalRecurso.titulo}
      />
    </>
  );
}
