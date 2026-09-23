import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Navbar } from '@/components/Navbar';
import { GuiaModal } from '@/components/GuiaModal';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { QRCodeSVG } from 'qrcode.react';
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
} from 'lucide-react';

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
  area_m2: number;
  pisos: number;
  aforo: number;
  usa_glp: boolean;
  galones_glp: number;
  tipo_tramite: string;
  nivel_riesgo: string;
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
  created_at: string;
}

interface Props {
  autoevaluacion: AutoevaluacionData;
}

export default function Resultado({ autoevaluacion }: Props) {
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [tabActiva, setTabActiva] = useState<'FICHA' | 'PLAN'>('FICHA');
  const [showGuardarProgreso, setShowGuardarProgreso] = useState<boolean>(false);
  const { auth } = usePage().props as { auth?: { user: { id: number; name: string } | null } };
  const esInvitado = !auth?.user;

  const urlSimulacion =
    typeof window !== 'undefined'
      ? `${window.location.origin}/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`
      : `/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`;

  const plan = autoevaluacion.plan_accion_costos || {
    tareas: [],
    costo_total: 0,
    total_items: 0,
  };

  const configSemaforo = {
    VERDE: {
      titulo: 'Nivel de Preparación Alto',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      badgeBg: 'bg-emerald-600',
      descripcion: 'Declaraste cumplir todas las condiciones técnicas de seguridad. Mantén la evidencia de cada condición y sigue listo para una eventual visita técnica.',
      icono: CheckCircle2,
    },
    AMBAR: {
      titulo: 'Nivel de Preparación Medio (Con Observaciones)',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-600',
      descripcion: 'Existen condiciones que aún declaras como no cumplidas o por revisar. Avanza en preparación y registra tu plan de subsanación preventiva.',
      icono: AlertTriangle,
    },
    ROJO: {
      titulo: 'Nivel de Preparación Crítico',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-[#7f1d1d]',
      badgeBg: 'bg-[#7f1d1d]',
      descripcion: 'Declaraste fallas críticas de seguridad (riesgo de incendio o electrocución). Prioriza corregirlas antes de una visita técnica.',
      icono: ShieldAlert,
    },
  }[autoevaluacion.semaforo] || {
    titulo: 'Autoevaluado',
    bg: 'bg-neutral-50',
    border: 'border-neutral-200',
    text: 'text-neutral-800',
    badgeBg: 'bg-neutral-700',
    descripcion: 'Autoevaluación procesada según lo declarado.',
    icono: ShieldCheck,
  };

  const IconoSemaforo = configSemaforo.icono;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-sans antialiased flex flex-col justify-between print:bg-white">
      <Head title={`Autoevaluación ITSE - ${autoevaluacion.nombre_comercio}`} />

      <div className="print:hidden">
        <Navbar />
        <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
        <ModalGuardarProgreso
          isOpen={showGuardarProgreso}
          onClose={() => setShowGuardarProgreso(false)}
          uuid={autoevaluacion.uuid_trazabilidad}
          establecimiento={autoevaluacion.nombre_comercio}
        />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10 w-full flex-1 print:p-0 print:max-w-none">

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
                className="inline-flex items-center gap-1 text-xs font-bold text-[#7f1d1d] hover:text-[#991b1b] bg-rose-50/60 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar mi progreso para continuar después
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
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
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#7f1d1d] hover:bg-[#991b1b] px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Plan de Subsanación Preventiva</span>
            </Link>
          </div>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center justify-center gap-3 mb-6 print:hidden">
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

                <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200/60">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase block">Modalidad Proyectada:</span>
                  <span className="text-sm font-extrabold text-neutral-900">
                    {autoevaluacion.tipo_tramite === 'EX_POST' ? 'ITSE Posterior (Ex-Post)' : 'ITSE Previa (Ex-Ante)'}
                  </span>
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Riesgo declarado: <strong>{autoevaluacion.nivel_riesgo.replace('_', ' ')}</strong>
                  </span>
                </div>
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
                </div>

                {/* Código QR de trazabilidad */}
                <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-100 self-center sm:self-auto">
                  <QRCodeSVG
                    value={urlSimulacion}
                    size={75}
                    level="M"
                    includeMargin={false}
                  />
                  <div className="text-[10px] text-neutral-500 space-y-1">
                    <span className="block font-bold text-neutral-800 text-xs">Credencial de Seguimiento Preventivo</span>
                    <p className="leading-tight text-neutral-500">
                      Escanea para abrir tu simulación de revisión in situ y dar seguimiento a tu plan de preparación.
                    </p>
                    <a
                      href={urlSimulacion}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#7f1d1d] font-bold hover:underline pt-1"
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
                  {autoevaluacion.detalle_checklist.map(item => (
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
                          : 'bg-rose-100 text-[#7f1d1d]'
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

        {/* CONTENIDO DE PESTAÑA: PLAN DE PREPARACIÓN CON COSTOS */}
        {tabActiva === 'PLAN' && (
          <div className="space-y-6">

            {/* Encabezado del Presupuesto */}
            <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-[#7f1d1d] px-2.5 py-0.5 rounded-full border border-rose-100">
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
                  <span className="text-2xl font-extrabold text-[#7f1d1d]">
                    S/ {plan.costo_total.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">Mano de obra y materiales Huancayo</span>
                </div>
              </div>
            </div>

            {/* Listado de Tareas Priorizadas */}
            {plan.tareas.length === 0 ? (
              <div className="p-8 rounded-3xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-emerald-950">Sin brechas declaradas</h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Declaraste cumplir todas las condiciones evaluadas. Mantén tus evidencias al día para conservar un buen nivel de preparación.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {plan.tareas.map((tarea, idx) => (
                  <div key={idx} className="bg-white border border-neutral-200/80 rounded-3xl p-5 text-left shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          tarea.prioridad === 'Alta'
                            ? 'bg-rose-100 text-[#7f1d1d]'
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
            <div className="flex justify-end print:hidden">
              <Link
                href={`/autoevaluacion/revision/${autoevaluacion.uuid_trazabilidad}`}
                className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-6 py-3.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Continuar con la Simulación de Revisión In Situ</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        )}

      </main>

      <footer className="border-t border-neutral-100 py-6 text-center text-[11px] text-neutral-400 print:hidden">
        CheckITSE Huancayo · Plataforma Cívica de Autoevaluación y Preparación ITSE
      </footer>
    </div>
  );
}