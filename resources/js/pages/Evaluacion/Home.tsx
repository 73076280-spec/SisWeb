import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { GuiaModal } from '@/components/GuiaModal';
import {
  ShieldCheck,
  ArrowRight,
  Info,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  Target,
  FolderCheck,
  Flame,
  Zap,
  Footprints,
  FlameKindling,
  Boxes,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

interface HomeProps {
  catalogo?: unknown[];
}

const HERO_IMAGEN_URL =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80';

export default function Home({ catalogo: _catalogo }: HomeProps) {
  const [showGuia, setShowGuia] = useState<boolean>(false);

  return (
    <>
      <Head title="CheckITSE Huancayo - Autoevaluación Preventiva ITSE" />
      <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />

      {/* Hero Principal */}
      <section className="mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="text-left">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Autoevaluación Preventiva ITSE · Huancayo
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 mt-4 leading-tight">
              Prepárate antes de la revisión de seguridad de tu establecimiento
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-3 max-w-lg leading-relaxed">
              Realiza una autoevaluación preventiva de tu local comercial en Huancayo, identifica qué condiciones requieren atención
              y organiza las medidas preventivas que puedes implementar antes de una revisión oficial.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <ClipboardList className="w-4 h-4" />
                Comenzar autoevaluación
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 bg-white border border-primary-200 px-6 py-3.5 rounded-2xl hover:bg-primary-50 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ver cómo funciona
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-neutral-500 mt-4 max-w-md">
              Puedes comenzar de forma anónima y sin registrarte. Herramienta cívica gratuita y orientativa.
            </p>
          </div>

          <div className="relative">
            <img
              src={HERO_IMAGEN_URL}
              alt="Interior de un local comercial ordenado y listo para su autoevaluación preventiva de seguridad"
              className="w-full h-64 sm:h-80 object-cover rounded-3xl border border-neutral-200/80 shadow-sm"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Aviso de Naturaleza Cívica y Deslinde Legal */}
      <section className="mb-16">
        <div className="rounded-3xl border border-info-200 bg-info-50 p-5 sm:p-6 text-left flex flex-col sm:flex-row items-start justify-between gap-4">
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
                Esta plataforma es un <strong>simulador cívico preventivo y orientativo</strong> para comerciantes y vecinos de Huancayo.
                Los resultados reflejan únicamente las condiciones declaradas por el ciudadano y{' '}
                <strong>no constituyen una inspección oficial</strong> ni reemplazan la inspección de un inspector técnico de seguridad en edificaciones (ITSE). CheckITSE no constituye aprobación, autorización ni certificación del establecimiento, ni emite licencias o certificados ITSE.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuia(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-info-800 hover:text-info-950 bg-white border border-info-200 px-3.5 py-2 rounded-xl transition shrink-0 self-end sm:self-center cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-500 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ver Base Legal</span>
          </button>
        </div>
      </section>

      {/* ¿Por qué utilizar CheckITSE? */}
      <section className="mb-16">
        <div className="max-w-2xl text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Beneficios ciudadanos</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-2">
            Una herramienta para prepararte y llevar un mejor control
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 mt-2">
            Sin reemplazar una inspección oficial, te permite revisar tu establecimiento y organizar tus mejoras con tranquilidad.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left">
            <div className="p-2.5 bg-primary-50 text-primary-700 border border-primary-100 rounded-2xl w-fit">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 mt-4">Evalúa</h3>
            <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
              Revisa las condiciones de seguridad de tu establecimiento mediante una autoevaluación guiada por normativa técnica.
            </p>
          </div>
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left">
            <div className="p-2.5 bg-warning-50 text-warning-700 border border-warning-100 rounded-2xl w-fit">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 mt-4">Identifica</h3>
            <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
              Detecta qué aspectos requieren atención antes de una revisión y conoce el estado de preparación de tu local.
            </p>
          </div>
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left">
            <div className="p-2.5 bg-success-50 text-success-700 border border-success-100 rounded-2xl w-fit">
              <FolderCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 mt-4">Organiza</h3>
            <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
              Organiza las medidas preventivas y mejoras necesarias para tu local antes de recibir una inspección formal.
            </p>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 mb-16">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="text-left">
            <span className="text-xs font-bold uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 rounded-full">
              Paso a paso
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-3">
              ¿Cómo funciona la autoevaluación preventiva?
            </h2>
            <p className="text-sm text-neutral-600 mt-1.5 max-w-xl">
              Un recorrido guiado y transparente en cuatro etapas simples, sin tecnicismos innecesarios.
            </p>
          </div>

          <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <li className="relative text-left p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100">
              <span className="w-9 h-9 rounded-2xl bg-primary-600 text-white text-sm font-extrabold flex items-center justify-center shadow-sm">
                01
              </span>
              <h3 className="text-sm font-bold text-neutral-900 mt-3">Registra tu local</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Ingresa los datos generales de tu establecimiento en Huancayo y declara sus condiciones físicas: giro, área, pisos, aforo y uso de gas o escaleras.
              </p>
            </li>
            <li className="relative text-left p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100">
              <span className="w-9 h-9 rounded-2xl bg-primary-600 text-white text-sm font-extrabold flex items-center justify-center shadow-sm">
                02
              </span>
              <h3 className="text-sm font-bold text-neutral-900 mt-3">Checklist dinámico</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                El motor normativo filtra las preguntas para mostrarte únicamente los criterios que corresponden a las condiciones reales de tu negocio.
              </p>
            </li>
            <li className="relative text-left p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100">
              <span className="w-9 h-9 rounded-2xl bg-primary-600 text-white text-sm font-extrabold flex items-center justify-center shadow-sm">
                03
              </span>
              <h3 className="text-sm font-bold text-neutral-900 mt-3">Resumen orientativo</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Visualiza el balance de condiciones cumplidas y pendientes, junto con recursos educativos técnicos para orientar tus mejoras.
              </p>
            </li>
            <li className="relative text-left p-5 rounded-2xl bg-neutral-50/70 border border-neutral-100">
              <span className="w-9 h-9 rounded-2xl bg-primary-600 text-white text-sm font-extrabold flex items-center justify-center shadow-sm">
                04
              </span>
              <h3 className="text-sm font-bold text-neutral-900 mt-3">Cierre y seguimiento</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Obtén un identificador de tu evaluación dentro de CheckITSE para consultar el registro y realizar nuevas reevaluaciones en el futuro.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* 5 Áreas Normativas Evaluadas */}
      <section className="mb-16">
        <div className="max-w-2xl text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Criterios técnicos normativos (Manual ITSE)</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 mt-2">
            5 áreas de seguridad evaluadas en tu local
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 mt-2">
            El sistema evalúa criterios técnicos basados en el Manual de Ejecución de ITSE y el RNE, adaptados a lo que realmente tiene tu comercio:
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Área 1: Incendios */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between">
            <div>
              <div className="p-2.5 bg-red-50 text-red-700 border border-red-100 rounded-2xl w-fit">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-4">
                Protección contra Incendios
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Extintores de polvo químico seco (PQS) y extintores especializados Clase K (en locales con cocción o frituras). Verificación de carga vigente, tarjeta de mantenimiento, altura reglamentaria y libre acceso sin obstáculos.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Extintores PQS y Clase K</span>
            </div>
          </div>

          {/* Área 2: Evacuación y Señalización */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between">
            <div>
              <div className="p-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl w-fit">
                <Footprints className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-4">
                Evacuación y Señalización
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Rutas y pasadizos de evacuación despejados, puertas de escape con apertura fluida en el sentido de evacuación, señalética de seguridad normalizada y luces de emergencia operativas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Rutas despejadas y luces de emergencia</span>
            </div>
          </div>

          {/* Área 3: Instalaciones Eléctricas */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between">
            <div>
              <div className="p-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl w-fit">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-4">
                Instalaciones Eléctricas
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Tableros eléctricos en material incombustible con mandil o contratapa, interruptores termomagnéticos debidamente dimensionados, protección diferencial contra descargas y cableado canalizado sin conductores expuestos.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tableros, diferenciales y canalizaciones</span>
            </div>
          </div>

          {/* Área 4: Gas Licuado de Petróleo */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between">
            <div>
              <div className="p-2.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-2xl w-fit">
                <FlameKindling className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-4">
                Instalaciones de Gas (GLP)
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Exclusivo para comercios que utilicen balones de gas: ubicación en ambientes ventilados a nivel de piso, uso de mangueras y reguladores normados, distancia de seguridad y cilindros en buen estado.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Aplica según declaración física</span>
            </div>
          </div>

          {/* Área 5: Estructuras y Almacenamiento */}
          <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 sm:p-6 shadow-xs text-left flex flex-col justify-between md:col-span-2 lg:col-span-1">
            <div>
              <div className="p-2.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-2xl w-fit">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mt-4">
                Estructuras y Almacenamiento
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                Seguridad física en escaleras con pasamanos continuos y pasos antideslizantes. Arriostramiento y anclaje antisísmico a pared o piso para estanterías altas y mobiliario con riesgo de vuelco.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 text-xs font-semibold text-neutral-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Aplica según escaleras o estanterías declaradas</span>
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas Frecuentes Ciudadanas */}
      <section className="mb-16">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-primary-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Dudas habituales</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            Preguntas frecuentes sobre CheckITSE Huancayo
          </h2>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">¿Tiene algún costo utilizar esta plataforma?</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                Ninguno. CheckITSE es una iniciativa cívica de orientación técnica completamente gratuita para todos los comerciantes y emprendedores de Huancayo.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">¿Esta plataforma reporta mis respuestas a la municipalidad?</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                CheckITSE es una herramienta independiente y preventiva. No está conectada a sistemas municipales ni genera actas de fiscalización. Las respuestas corresponden a las declaraciones que realiza el ciudadano dentro de la plataforma.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">¿Es obligatorio tener RUC para iniciar?</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                No es obligatorio. Puedes registrar el RUC de tu negocio si lo tienes a mano para identificar tu reporte, o continuar libremente sin RUC.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">¿Qué pasa si mi local no tiene escaleras ni gas?</h3>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
                El motor de aplicabilidad filtra automáticamente las preguntas que no corresponden a tu negocio. Solo responderás sobre las condiciones que realmente aplican a tu local.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Banner de Llamado a la Acción (CTA Final) */}
      <section className="mb-12">
        <div className="rounded-3xl bg-neutral-900 text-white p-8 sm:p-10 text-center relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-300 bg-primary-950/60 border border-primary-800 px-3 py-1 rounded-full">
              Comienza hoy mismo
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
              ¿Listo para revisar la seguridad de tu local?
            </h2>
            <p className="text-sm text-neutral-300 mt-2 leading-relaxed">
              Toma el control preventivo de tu establecimiento en Huancayo en solo unos minutos. Sin registros obligatorios ni tecnicismos confusos.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/autoevaluacion/nueva"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
              >
                <ClipboardList className="w-4 h-4" />
                Iniciar autoevaluación ahora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
