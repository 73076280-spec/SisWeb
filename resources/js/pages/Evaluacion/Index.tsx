import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Navbar } from '@/components/Navbar';
import { GuiaModal } from '@/components/GuiaModal';
import { ZonificacionAlerta } from '@/components/ZonificacionAlerta';
import { VideoEducativoModal, RecursoEducativoData } from '@/components/VideoEducativoModal';
import { 
  Store, 
  Flame, 
  Layers, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  PlayCircle
} from 'lucide-react';

interface RecursoCatalogo {
  codigo: string;
  video_url: string | null;
  tipo?: string | null;
  base_legal?: string | null;
  evidencia_sugerida?: string | null;
}

interface ChecklistItem {
  codigo: string;
  nombre: string;
  categoria: 'INCENDIOS' | 'ELECTRICIDAD' | 'EVACUACION' | 'ESTRUCTURAL_AUXILIOS';
  estado: 'CUMPLE' | 'NO_CUMPLE' | 'POR_REVISAR' | 'NA';
  cumple: boolean;
  es_critico: boolean;
  norma: string;
  por_que: string;
  riesgo_real: string;
  solucion: string;
}

interface FormEvaluacionData {
  nombre_comercio: string;
  funcion_economica: string;
  ruc: string;
  sector: string;
  area_m2: string;
  pisos: number;
  aforo: number;
  usa_glp: boolean;
  galones_glp: number;
  usa_caldero: boolean;
  usa_liquidos_inflamables: boolean;
  checklist: ChecklistItem[];
  [key: string]: any;
}

const CHECKLIST_CATALOGO_OFICIAL: ChecklistItem[] = [
  // --- 1. SEGURIDAD CONTRA INCENDIOS (RNE A.130 / NTP) ---
  {
    codigo: 'EXTINTOR_PQS',
    nombre: 'Extintor PQS con carga vigente, tarjeta de mantenimiento y manómetro operativo',
    categoria: 'INCENDIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'NTP 350.043-1 / RNE A.130 Art. 163',
    por_que: 'El polvo químico seco sofoca fuegos clase ABC en fase inicial evitando la propagación súbita.',
    riesgo_real: 'Si el extintor está despresurizado o vencido, el fuego no se puede contener y deviene en siniestro total.',
    solucion: 'Contratar empresa autorizada para recarga anual y mantener tarjeta de inspección mensual visible.'
  },
  {
    codigo: 'EXTINTOR_K',
    nombre: 'Extintor de Acetato de Potasio (Tipo K) en cocinas comerciales o freidoras',
    categoria: 'INCENDIOS',
    estado: 'NA',
    cumple: true,
    es_critico: true,
    norma: 'NTP 350.043-1 Art. 7.2',
    por_que: 'El agua o PQS común provocan explosión violenta de salpicadura al contacto con aceite caliente.',
    riesgo_real: 'Quemaduras de tercer grado al personal y propagación instantánea del fuego hacia conductos de ventilación.',
    solucion: 'Instalar extintor con agente químico húmedo de acetato de potasio si se preparan frituras o se usa cocina comercial.'
  },
  {
    codigo: 'DETECTORES_HUMO',
    nombre: 'Detectores de humo fotoeléctricos autónomos o centralizados operativos',
    categoria: 'INCENDIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma A.130 Art. 53 / NFPA 72',
    por_que: 'Alerta temprana acústica que permite evacuar antes de que el monóxido de carbono asfixie a los ocupantes.',
    riesgo_real: 'Inhalación letal de gases tóxicos antes de detectar llamas visibles.',
    solucion: 'Instalar sensores de humo fotoeléctricos con batería de respaldo en techos de ambientes cerrados.'
  },
  {
    codigo: 'CAMPANA_EXTRACCION',
    nombre: 'Campana extractora con filtros metálicos limpios y ducto incombustible',
    categoria: 'INCENDIOS',
    estado: 'NA',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma EM.030 / CENEPRED Anexo 4',
    por_que: 'La grasa acumulada en ductos es combustible líquido altamente inflamable a altas temperaturas.',
    riesgo_real: 'Incendio de ducto que se propaga por el falso cielo raso a todo el inmueble.',
    solucion: 'Mantenimiento y desengrase periódico de ductos y trampas de grasa metálicas.'
  },

  // --- 2. SEGURIDAD ELÉCTRICA (CNE-U / R.M. 175-2008-MEM) ---
  {
    codigo: 'DIFERENCIAL',
    nombre: 'Interruptores diferenciales de 30mA en circuitos eléctricos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
    por_que: 'Corta la corriente en milisegundos al detectar fugas que pueden electrocutar a una persona.',
    riesgo_real: 'Muerte por fibrilación ventricular al tocar un equipo energizado o chispa constante que origina incendios.',
    solucion: 'Instalar una llave diferencial de 30mA (2x25A o 2x40A) por cada circuito o barra de distribución.'
  },
  {
    codigo: 'TERMOMAGNETICO',
    nombre: 'Interruptores termomagnéticos calibrados a la sección del cable (sin puentes)',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 150-400',
    por_que: 'Protege los conductores eléctricos frente a sobrecargas y cortocircuitos térmicos.',
    riesgo_real: 'Calentamiento de cables empotrados que funde el aislamiento e inicia fuego estructural.',
    solucion: 'Sustituir llaves sobrecalibradas o defectuosas por termomagnéticas de marca homologada.'
  },
  {
    codigo: 'TABLERO_MANDIL',
    nombre: 'Tablero eléctrico con mandil protector (resina o metálico) y sin cables expuestos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'CNE-U Regla 020.132 / Regla 070.212',
    por_que: 'Evita el contacto accidental directo con barras o bornes con tensión al manipular las llaves térmicas.',
    riesgo_real: 'Arco eléctrico y quemaduras severas en manos y rostro de los dependientes.',
    solucion: 'Colocar tapa mandil con bisagras y sellar espacios libres con tapas ciegas aislantes.'
  },
  {
    codigo: 'POZO_TIERRA',
    nombre: 'Sistema de puesta a tierra con protocolo vigente (menor o igual a 25 Ohmios)',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'CNE-U Regla 060.712 / R.J. 016-2018 Anexo 4',
    por_que: 'Drena corrientes estáticas y de falla hacia el suelo, protegiendo computadoras, vitrinas y vidas.',
    riesgo_real: 'Sobretensiones transitorias y riesgo de electrocución permanente en carcasas metálicas.',
    solucion: 'Mantenimiento anual con sales de bentonita/gel y certificado firmado por ingeniero electricista colegiado.'
  },
  {
    codigo: 'CABLEADO_CANALIZADO',
    nombre: 'Cables eléctricos canalizados en tuberías o canaletas libres de empalmes expuestos',
    categoria: 'ELECTRICIDAD',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'CNE-U Regla 070.212',
    por_que: 'El aislamiento exterior protege al cable del desgaste mecánico, roedores y humedad ambiental.',
    riesgo_real: 'Cortocircuito accidental al rozar estanterías metálicas o mercadería con cables mellizos sueltos.',
    solucion: 'Canalizar todo cableado expuesto en canaletas de PVC adosadas a la pared o tubería conduit.'
  },

  // --- 3. EVACUACIÓN Y ARQUITECTURA (RNE A.010 / A.130) ---
  {
    codigo: 'EVACUACION',
    nombre: 'Rutas y salidas de escape 100% despejadas (ancho útil mín. 0.90m - 1.20m)',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'RNE Norma A.010 Art. 25 y A.130 Art. 13',
    por_que: 'En un sismo o pánico, los pasillos estrechos o con cajas provocan tropiezos y avalanchas humanas.',
    riesgo_real: 'Asfixia y aplastamiento por imposibilidad de desalojo del local en menos de 180 segundos.',
    solucion: 'Retirar vitrinas, mercadería o exhibidores que reduzcan el pasaje a menos del ancho normativo.'
  },
  {
    codigo: 'PUERTAS_ESCAPE',
    nombre: 'Puertas de salida de fácil apertura sin cerrojos trabados en horario de atención',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: true,
    norma: 'RNE Norma A.010 Art. 26',
    por_que: 'En caso de pánico, una cerradura compleja o candado impide la salida inmediata.',
    riesgo_real: 'Asfixia de personas atrapadas frente a una puerta cerrada con llave durante un siniestro.',
    solucion: 'Retirar cerrojos restrictivos y asegurar apertura hacia afuera si el aforo es mayor a 50 personas.'
  },
  {
    codigo: 'LUCES_EMERG',
    nombre: 'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)',
    categoria: 'EVACUACION',
    estado: 'NO_CUMPLE',
    cumple: false,
    es_critico: false,
    norma: 'RNE Norma A.130 Art. 39 / NTP IEC 60598-2-22',
    por_que: 'En corte de energía por sismo o incendio nocturno, el humo reduce la visibilidad al 5%.',
    riesgo_real: 'Desorientación y desespero de los clientes hacia zonas sin salida.',
    solucion: 'Instalar lámparas LED autónomas conectadas a la red general con prueba mensual de batería.'
  },
  {
    codigo: 'SENALETICA',
    nombre: 'Señales fotoluminiscentes de seguridad reglamentarias (Salida, Extintor, Sismo)',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'NTP 399.010-1 (Colores y Símbolos de Seguridad)',
    por_que: 'Brillan en la oscuridad total guiando intuitivamente la evacuación y el acceso a equipos de auxilio.',
    riesgo_real: 'Tiempo perdido valioso buscando un extintor oculto o la puerta de escape.',
    solucion: 'Pegar láminas vinílicas reflectivas reglamentarias a una altura de 1.80m a 2.10m.'
  },
  {
    codigo: 'AFORO_CARTEL',
    nombre: 'Cartel de aforo máximo permitido visible en el acceso principal',
    categoria: 'EVACUACION',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma A.010 Art. 20',
    por_que: 'Comunica la capacidad límite de personas para evitar colapso de las vías de evacuación.',
    riesgo_real: 'Sobrecarga de ocupantes que impide la salida rápida ante emergencias sísmicas.',
    solucion: 'Fijar cartel visible en el ingreso indicando aforo conforme a cálculo técnico por m².'
  },

  // --- 4. ESTRUCTURAL Y AUXILIOS (Arriola 2024 / INDECI) ---
  {
    codigo: 'BOTIQUIN',
    nombre: 'Botiquín de primeros auxilios abastecido y adosado en pared visible',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'Directiva INDECI / CENEPRED',
    por_que: 'Permite estabilizar cortes, contusiones menores o quemaduras previas a la llegada de paramédicos.',
    riesgo_real: 'Infección acelerada de heridas o hemorragias sin contención inmediata.',
    solucion: 'Botiquín tipo gabinete con alcohol, gasas estériles, vendas, esparadrapo y tijeras.'
  },
  {
    codigo: 'ANCLAJE_ESTANTERIAS',
    nombre: 'Anclaje sismorresistente a muro/piso de estanterías y anaqueles mayores a 1.80 m',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE E.030 Sismorresistente / Arriola (2024)',
    por_que: 'En el valle del Mantaro la amplificación de ondas sísmicas en suelos blandos vuelca muebles altos.',
    riesgo_real: 'Aplastamiento de clientes y personal por caída frontal de anaqueles pesados con mercadería.',
    solucion: 'Fijar con pernos expansivos o ángulos metálicos los parantes de estanterías hacia muros portantes.'
  },
  {
    codigo: 'LAMINADO_VIDRIOS',
    nombre: 'Vidrios crudos protegidos con láminas de seguridad de 4 micras o templados',
    categoria: 'ESTRUCTURAL_AUXILIOS',
    estado: 'CUMPLE',
    cumple: true,
    es_critico: false,
    norma: 'RNE Norma E.040 Vidrio',
    por_que: 'La lámina retiene los fragmentos afilados evitando que salgan despedidos durante un terremoto.',
    riesgo_real: 'Heridas cortantes graves o amputaciones producidas por vidrios de mamparas rotas.',
    solucion: 'Instalar lámina transparente de seguridad en toda luna cruda contigua a circulación peatonal.'
  },
];

export default function Index({ catalogo = [] }: { catalogo?: RecursoCatalogo[] }) {
  const [paso, setPaso] = useState<number>(1);
  const [showGuia, setShowGuia] = useState<boolean>(false);
  const [openHelp, setOpenHelp] = useState<Record<string, boolean>>({});
  const [recursoActivo, setRecursoActivo] = useState<RecursoEducativoData | null>(null);

  const recursosPorCodigo = new Map<string, RecursoCatalogo>(catalogo.map(r => [r.codigo, r]));

  const { data, setData, post, processing, errors } = useForm<FormEvaluacionData>({
    nombre_comercio: '',
    funcion_economica: 'Comercio',
    ruc: '',
    sector: 'San Carlos (Huancayo Centro)',
    area_m2: '80',
    pisos: 1,
    aforo: 15,
    usa_glp: false,
    galones_glp: 0,
    usa_caldero: false,
    usa_liquidos_inflamables: false,
    checklist: CHECKLIST_CATALOGO_OFICIAL.map(i => ({ ...i, estado: 'POR_REVISAR', cumple: false })),
  });

  const toggleHelp = (codigo: string) => {
    setOpenHelp(prev => ({ ...prev, [codigo]: !prev[codigo] }));
  };

  const setItemEstadoGlobal = (estado: ChecklistItem['estado']) => {
    const nuevoChecklist = data.checklist.map(i => ({
      ...i,
      estado: i.estado === 'POR_REVISAR' ? estado : i.estado,
      cumple: i.estado === 'POR_REVISAR' ? estado === 'CUMPLE' : i.cumple,
    }));
    setData('checklist', nuevoChecklist);
  };

  const setItemEstado = (index: number, estado: ChecklistItem['estado']) => {
    const nuevoChecklist = [...data.checklist];
    nuevoChecklist[index].estado = estado;
    nuevoChecklist[index].cumple = estado === 'CUMPLE';
    setData('checklist', nuevoChecklist);
  };

  const validarYContinuarPaso2 = () => {
    if (!data.nombre_comercio.trim()) {
      alert('Por favor, ingresa el nombre comercial del establecimiento.');
      return;
    }

    const rucValido = /^(10|20)\d{9}$/.test(data.ruc);
    if (!rucValido) {
      alert('El RUC debe tener exactamente 11 dígitos numéricos y comenzar con 10 o 20.');
      return;
    }

    setPaso(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/autoevaluacion');
  };

  const esExAntePorEscala = 
    (data.funcion_economica === 'Comercio' && (Number(data.area_m2) > 750 || Number(data.pisos) > 3)) ||
    (data.funcion_economica !== 'Comercio' && (Number(data.area_m2) > 500 || Number(data.pisos) > 2 || Number(data.aforo) > 100)) ||
    data.usa_caldero ||
    (data.usa_glp && Number(data.galones_glp) > 118.18) ||
    data.usa_liquidos_inflamables;

  const totalItems = data.checklist.length;
  const cumplidos = data.checklist.filter(i => i.estado === 'CUMPLE').length;
  const noCumplidos = data.checklist.filter(i => i.estado === 'NO_CUMPLE').length;
  const porRevisar = data.checklist.filter(i => i.estado === 'POR_REVISAR').length;
  const noAplica = data.checklist.filter(i => i.estado === 'NA').length;
  const tieneCriticaActiva = data.checklist.some(i => i.es_critico && i.estado === 'NO_CUMPLE');

  const categorias = [
    { key: 'INCENDIOS', label: '1. Protección Contra Incendios' },
    { key: 'ELECTRICIDAD', label: '2. Instalaciones Eléctricas' },
    { key: 'EVACUACION', label: '3. Evacuación y Señalización' },
    { key: 'ESTRUCTURAL_AUXILIOS', label: '4. Estructuras no Portantes y Auxilios' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 font-sans antialiased flex flex-col justify-between">
      <Head title="CheckITSE Huancayo - Autoevaluación Preventiva ITSE" />
      <Navbar />
      <GuiaModal isOpen={showGuia} onClose={() => setShowGuia(false)} />
      <VideoEducativoModal
        isOpen={!!recursoActivo}
        onClose={() => setRecursoActivo(null)}
        recurso={recursoActivo}
      />

      <main className="max-w-3xl mx-auto px-6 py-10 w-full flex-1">
        
        {/* Cabecera */}
        <div className="text-center mb-8">
          <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-[#7f1d1d] border border-rose-100 px-3 py-1 rounded-full">
            Simulador Preventivo Cívico · R.J. 016-2018-CENEPRED
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 mt-3">
            Autoevaluación de Seguridad ITSE
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-lg mx-auto">
            Antes de una inspección ITSE, revisa por tu cuenta las condiciones de seguridad de tu establecimiento y prepárate mejor.
          </p>
        </div>

        {/* Tarjeta Contextual de Sustento Cívico y Base Legal */}
        <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-white border border-neutral-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-50 text-[#7f1d1d] border border-rose-100 rounded-2xl shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-neutral-900">
                  Herramienta de Autoevaluación y Preparación Técnica
                </h3>
                <span className="text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                  R.J. 016-2018-CENEPRED / D.S. 002-2018-PCM
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed max-w-xl">
                Plataforma de acceso libre para comerciantes y vecinos de Huancayo. Responde qué condiciones declaras cumplir (aforo, extintores, pozo a tierra, vías de escape) y, si detectas deficiencias, registra tu plan de subsanación. Los resultados corresponden solo a lo que tú declaras y no sustituyen una inspección oficial.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuia(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7f1d1d] hover:text-[#991b1b] bg-rose-50/50 hover:bg-rose-50 border border-rose-100 px-3.5 py-2 rounded-xl transition shrink-0 self-end sm:self-center cursor-pointer active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ver Base Legal</span>
          </button>
        </div>

        {/* Indicador de Pasos */}
        <div className="flex items-center justify-center gap-2 mb-8 text-xs font-semibold">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${paso === 1 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            <span>1</span>
            <span>Datos y Escala Física</span>
          </div>
          <span className="text-neutral-300">/</span>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${paso === 2 ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
            <span>2</span>
            <span>Checklist Didáctico ({cumplidos}/{totalItems - noAplica})</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {paso === 1 ? (
            <div className="space-y-6">
              
              {/* Tarjeta: Datos Generales */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
                <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#7f1d1d]" /> Identificación y Giro Económico
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      Nombre Comercial del Establecimiento
                    </label>
                    <input
                      type="text"
                      required
                      value={data.nombre_comercio}
                      onChange={e => setData('nombre_comercio', e.target.value)}
                      placeholder="Ej: Bodega Don Pepe"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                    />
                    {errors.nombre_comercio && <span className="text-rose-600 text-[10px] mt-1 block">{errors.nombre_comercio}</span>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      RUC del Titular (11 dígitos)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={data.ruc}
                      onChange={e => setData('ruc', e.target.value.replace(/\D/g, ''))}
                      placeholder="20601234567"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-mono font-medium focus:border-[#7f1d1d] outline-none"
                    />
                    {errors.ruc && <span className="text-rose-600 text-[10px] mt-1 block">{errors.ruc}</span>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      Función Económica (R.J. 016-2018-CENEPRED)
                    </label>
                    <select
                      value={data.funcion_economica}
                      onChange={e => setData('funcion_economica', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                    >
                      <option value="Comercio">Comercio (Bodegas, Farmacias, Tiendas, Bazares)</option>
                      <option value="Encuentro">Encuentro (Restaurantes, Cafeterías, Bares, Discotecas)</option>
                      <option value="Hospedaje">Hospedaje (Hoteles, Hostales)</option>
                      <option value="Salud">Salud (Consultorios, Clínicas, Laboratorios)</option>
                      <option value="Educacion">Educación (Colegios, Academias, Nidos)</option>
                      <option value="Industrial">Industrial (Talleres mecánicos, Carpinterías, Fábricas)</option>
                      <option value="Oficinas">Oficinas y Servicios Administrativos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Escala Física */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
                <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#7f1d1d]" /> Escala Física y Capacidad (RNE G.040)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      Área Techada (m²)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.1"
                      value={data.area_m2}
                      onChange={e => setData('area_m2', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">Límite Ex-Post: 750 m²</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      Número de Pisos
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="20"
                      value={data.pisos}
                      onChange={e => setData('pisos', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">Límite Ex-Post: Hasta 3 pisos</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                      Aforo Estimado (Personas)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={data.aforo}
                      onChange={e => setData('aforo', parseInt(e.target.value) || 1)}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">RNE Norma A.130</span>
                  </div>
                </div>
              </div>

              {/* Tarjeta: Carga Térmica */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
                <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#7f1d1d]" /> Carga Térmica y Factores Agravantes
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 block">¿Usa Gas Licuado de Petróleo (GLP)?</span>
                      <span className="text-[11px] text-neutral-400">Balones o tanques de GLP para cocción o proceso.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.usa_glp}
                        onChange={e => setData('usa_glp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7f1d1d]"></div>
                    </label>
                  </div>

                  {data.usa_glp && (
                    <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl">
                      <label className="block text-[11px] font-bold uppercase text-amber-900 mb-1">
                        Cantidad Total Almacenada de GLP (Galones)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={data.galones_glp}
                        onChange={e => setData('galones_glp', parseFloat(e.target.value) || 0)}
                        className="w-full sm:w-48 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                      />
                      <span className="text-[10px] text-amber-800 block mt-1">
                        Nota: Superar los 118.18 galones (0.45 m³) eleva el trámite a ITSE Previa (R.J. 016-2018).
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.usa_caldero}
                        onChange={e => setData('usa_caldero', e.target.checked)}
                        className="rounded border-neutral-300 text-[#7f1d1d] focus:ring-[#7f1d1d]"
                      />
                      <span className="text-xs font-medium text-neutral-700">Presencia de caldero</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-50 border border-neutral-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.usa_liquidos_inflamables}
                        onChange={e => setData('usa_liquidos_inflamables', e.target.checked)}
                        className="rounded border-neutral-300 text-[#7f1d1d] focus:ring-[#7f1d1d]"
                      />
                      <span className="text-xs font-medium text-neutral-700">Líquidos o reactivos inflamables</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Amenaza Sísmica Huancayo */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 shadow-xs text-left">
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase text-neutral-500 mb-1">
                    Sector Territorial (Provincia de Huancayo)
                  </label>
                  <select
                    value={data.sector}
                    onChange={e => setData('sector', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-medium focus:border-[#7f1d1d] outline-none"
                  >
                    <option value="San Carlos (Huancayo Centro)">Huancayo Centro (San Carlos / Zona Comercial)</option>
                    <option value="El Tambo (Zona Pio Pato)">El Tambo (Sector Pio Pato / Av. Huancavelica)</option>
                    <option value="Chilca (Azapampa - Suelo Cohesivo)">Chilca (Azapampa / Suelo Blando y Humedal)</option>
                    <option value="Pilcomayo (Zona Aluvial)">Pilcomayo (Zona Aluvial / Río Mantaro)</option>
                  </select>
                </div>

                <ZonificacionAlerta sector={data.sector} />
              </div>

              {/* Modalidad Proyectada */}
              <div className={`p-4 rounded-2xl border text-left flex items-start gap-3 ${
                esExAntePorEscala ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                {esExAntePorEscala ? (
                  <AlertTriangle className="w-5 h-5 text-[#7f1d1d] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs leading-relaxed">
                  <strong>Modalidad proyectada según R.J. 016-2018: </strong>
                  {esExAntePorEscala ? (
                    <span><strong>ITSE Previa (Ex-Ante)</strong>. Por las dimensiones, pisos o carga térmica, el local requerirá inspección multidisciplinaria previa a la Licencia.</span>
                  ) : (
                    <span><strong>ITSE Posterior (Ex-Post)</strong>. Tu establecimiento califica para inspección municipal posterior (licencia ágil).</span>
                  )}
                </div>
              </div>

              {/* Botón Siguiente */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={validarYContinuarPaso2}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span>Continuar al Checklist Didáctico</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            /* PASO 2: CHECKLIST DIDÁCTICO CON MICRO-LEARNING */
            <div className="space-y-6">

              {/* Alerta si existen errores de validación */}
              {Object.keys(errors).length > 0 && (
                <div className="bg-rose-100 border border-rose-300 rounded-2xl p-4 text-left text-xs text-rose-950">
                  <strong>Por favor corrige los siguientes datos:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {Object.values(errors).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Barra Resumen y Alerta Temprana */}
              <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-xs text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#7f1d1d]" />
                    <h3 className="text-sm font-bold text-neutral-900">Condiciones Técnicas de Seguridad</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Responde según lo que realmente tienes. Las condiciones marcadas como "No Cumple" te permitirán armar tu plan de preparación preventiva.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200">
                      {cumplidos} Cumple
                    </span>
                    <span className="px-2.5 py-1 bg-rose-50 text-[#7f1d1d] font-bold rounded-xl border border-rose-200">
                      {noCumplidos} No Cumple
                    </span>
                    {porRevisar > 0 && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200">
                        {porRevisar} Por Revisar
                      </span>
                    )}
                    {noAplica > 0 && (
                      <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 font-bold rounded-xl border border-neutral-200">
                        {noAplica} N/A
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItemEstadoGlobal('CUMPLE')}
                    className="text-[10px] font-bold text-[#7f1d1d] hover:text-[#991b1b] border border-rose-100 bg-rose-50/50 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Marcar el resto como Cumple
                  </button>
                </div>
              </div>

              {tieneCriticaActiva && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#7f1d1d] shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-950 leading-relaxed">
                    <strong>Pendiente urgente:</strong> Declaraste al menos una <strong>Falla Crítica de Seguridad</strong> como "No Cumple". Según lo que declaras, tu nivel de preparación es crítico: prioriza su corrección antes de una visita técnica. Recuerda que este resultado refleja solo tu declaración y no sustituye una inspección.
                  </p>
                </div>
              )}

              {/* Lista de Ítems Didácticos Agrupados por Especialidad */}
              {categorias.map(cat => {
                const itemsDeCategoria = data.checklist
                  .map((item, originalIndex) => ({ item, originalIndex }))
                  .filter(({ item }) => item.categoria === cat.key);

                if (itemsDeCategoria.length === 0) return null;

                return (
                  <div key={cat.key} className="space-y-3 text-left">
                    <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[#7f1d1d]">
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">
                        ({itemsDeCategoria.length} condiciones)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {itemsDeCategoria.map(({ item, originalIndex }) => {
                        const isOpen = openHelp[item.codigo] || false;
                        const recursoDelItem = recursosPorCodigo.get(item.codigo);

                        return (
                          <div 
                            key={item.codigo} 
                            className={`bg-white border rounded-3xl p-5 shadow-xs transition-all ${
                              item.estado === 'NO_CUMPLE' && item.es_critico 
                                ? 'border-rose-200 bg-rose-50/20' 
                                : 'border-neutral-200/80'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-mono font-bold text-neutral-400">
                                    {item.norma.split('/')[0]}
                                  </span>
                                  {item.es_critico && (
                                    <span className="text-[9px] font-bold bg-rose-100 text-[#7f1d1d] px-2 py-0.5 rounded-full">
                                      Falla Crítica
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
                                  {item.nombre}
                                </h4>
                              </div>

                              {/* Selector de Estado */}
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setItemEstado(originalIndex, 'CUMPLE')}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                    item.estado === 'CUMPLE'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  Cumple
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemEstado(originalIndex, 'NO_CUMPLE')}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                    item.estado === 'NO_CUMPLE'
                                      ? 'bg-[#7f1d1d] text-white border-[#7f1d1d] shadow-xs'
                                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  No Cumple
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemEstado(originalIndex, 'POR_REVISAR')}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                    item.estado === 'POR_REVISAR'
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                                      : 'bg-white text-amber-700 border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  Por Revisar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemEstado(originalIndex, 'NA')}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                                    item.estado === 'NA'
                                      ? 'bg-neutral-700 text-white border-neutral-700 shadow-xs'
                                      : 'bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50'
                                  }`}
                                >
                                  N/A
                                </button>
                              </div>
                            </div>

                            {/* Botón "¿Por qué me piden esto?" y "Ver Guía / Video" */}
                            <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleHelp(item.codigo)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7f1d1d] hover:text-[#991b1b] cursor-pointer"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                  <span>¿Por qué me piden esto?</span>
                                  {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {recursoDelItem?.video_url && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRecursoActivo({
                                        titulo: item.nombre,
                                        video_url: recursoDelItem.video_url,
                                        tipo: recursoDelItem.tipo,
                                        base_legal: recursoDelItem.base_legal,
                                        evidencia_sugerida: recursoDelItem.evidencia_sugerida,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-[#7f1d1d] cursor-pointer"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5" />
                                    <span>Ver Guía / Video</span>
                                  </button>
                                )}
                              </div>

                              <span className="text-[10px] text-neutral-400 font-mono">
                                {item.norma}
                              </span>
                            </div>

                            {/* Panel de Micro-learning desplegable */}
                            {isOpen && (
                              <div className="mt-3 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 text-xs text-amber-950 space-y-2">
                                <div className="flex items-start gap-2">
                                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                  <div>
                                    <strong className="block text-[11px] uppercase tracking-wider text-amber-900">Fundamento Técnico & Razón de Seguridad:</strong>
                                    <p className="mt-0.5 text-neutral-700 leading-relaxed">{item.por_que}</p>
                                  </div>
                                </div>

                                <div className="pl-6 border-l-2 border-rose-300">
                                  <strong className="text-[10px] uppercase tracking-wider text-[#7f1d1d]">Riesgo Real Asociado:</strong>
                                  <p className="text-neutral-700 leading-relaxed">{item.riesgo_real}</p>
                                </div>

                                <div className="pl-6 border-l-2 border-emerald-400">
                                  <strong className="text-[10px] uppercase tracking-wider text-emerald-800">Solución Normativa Sugerida:</strong>
                                  <p className="text-neutral-700 leading-relaxed">{item.solucion}</p>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Controles de Navegación del Paso 2 */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <span>{processing ? 'Generando Diagnóstico...' : 'Finalizar Autoevaluación ITSE'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </form>

      </main>

      <footer className="border-t border-neutral-100 py-6 text-center text-[11px] text-neutral-400">
        CheckITSE Huancayo · Asistente Cívico basado en la R.J. N° 016-2018-CENEPRED/J y RNE
      </footer>
    </div>
  );
}