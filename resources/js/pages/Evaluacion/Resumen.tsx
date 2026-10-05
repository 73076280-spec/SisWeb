import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ModalGuardarProgreso } from '@/components/ModalGuardarProgreso';
import { RecursoEducativoModal, type RecursoEducativoData } from '@/components/RecursoEducativoModal';
import { NubeAsistenciaModal, type CriterioAsistencia } from '@/components/Evaluacion/NubeAsistenciaModal';
import { DesgloseEspecialidades } from '@/components/Evaluacion/DesgloseEspecialidades';
import { HojaModeloAnexo } from '@/components/Evaluacion/HojaModeloAnexo';
import { DiagnosticoMultidimensional } from '@/components/Evaluacion/DiagnosticoMultidimensional';
import { CajaNotasSubsanacion } from '@/components/Evaluacion/CajaNotasSubsanacion';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Building2,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Clock,
    Coins,
    FileCheck,
    FileText,
    Files,
    HelpCircle,
    Layers,
    Loader2,
    Lock,
    MapPin,
    Hash,
    Printer,
    RefreshCw,
    RotateCcw,
    Save,
    Scale,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Store,
    TrendingDown,
    Wrench,
    X,
} from 'lucide-react';

import type {
    FinalizarPendiente,
    ResumenProps,
} from '@/types/contrato';

/**
 * Secuencia del flujo ciudadano cívico.
 */
const PASOS_FLUJO = [
    { numero: '1', titulo: 'Calcular riesgo', estado: 'completado' },
    { numero: '2', titulo: 'Simulacro en vivo', estado: 'completado' },
    { numero: '3', titulo: 'Diagnóstico Técnico', estado: 'activo' },
] as const;

/**
 * Etiquetas ciudadanas de `caracteristicas_declaradas`.
 */
const CARACTERISTICAS_DECLARADAS: Record<string, { etiqueta: string; sufijo?: string }> = {
    area_m2: { etiqueta: 'Área techada', sufijo: ' m²' },
    pisos: { etiqueta: 'Número de pisos' },
    aforo: { etiqueta: 'Aforo declarado' },
    usa_glp: { etiqueta: 'Utiliza GLP' },
    galones_glp: { etiqueta: 'Cantidad de GLP almacenada', sufijo: ' galones' },
    usa_caldero: { etiqueta: 'Utiliza caldero' },
    usa_liquidos_inflamables: { etiqueta: 'Almacena o manipula líquidos inflamables' },
    combustibles_liquidos_m3: { etiqueta: 'Volumen de combustibles líquidos', sufijo: ' m³' },
    en_sotano: { etiqueta: 'Actividad en sótano o semisótano' },
    galeria_sin_itse: { etiqueta: 'En galería sin ITSE en áreas comunes' },
    tiene_equipos_fritura: { etiqueta: 'Equipos de fritura o cocción con aceites' },
    tiene_escaleras: { etiqueta: 'Escaleras de circulación' },
    tiene_estanterias_altas: { etiqueta: 'Estanterías altas o mobiliario con riesgo de volteo' },
};

/**
 * Contenido cívico de la modalidad de trámite según D.S. N° 002-2018-PCM.
 */
const MODALIDAD_TRAMITE = {
    EX_POST: {
        badge: 'Modalidad: ITSE Posterior (D.S. N° 002-2018-PCM)',
        badgeClases: 'border-sky-300 bg-sky-50 text-sky-900',
        icono: ShieldCheck,
        iconoClases: 'border-sky-200 bg-sky-100 text-sky-700',
        titulo: 'ITSE Posterior (Silencio Positivo / Ex-Post)',
        mensaje:
            'Tu establecimiento califica para tramitar la Licencia de Funcionamiento presentando la Declaración Jurada de Cumplimiento (Anexo 4). La inspección técnica de Defensa Civil se ejecuta con posterioridad.',
        plazo: 'Hasta 3 días hábiles para subsanar observaciones no relevantes.',
        detallePlazo:
            'De existir observaciones subsanables en el acta de inspección posterior, se otorga hasta 3 días hábiles para subsanar mediante declaración jurada y panel fotográfico ingresado por Mesa de Partes (sin segunda visita presencial).',
        reprogramacion:
            'Diligencia única: Si el inspector no puede acceder, se puede reprogramar por única vez dentro de los 2 días hábiles; de persistir la inasistencia o negativa, se emite Resolución Denegatoria.',
        plazoIcono: Clock,
    },
    EX_ANTE: {
        badge: 'Modalidad: ITSE Previa (Inspección Multidisciplinaria)',
        badgeClases: 'border-amber-300 bg-amber-50 text-amber-900',
        icono: ShieldAlert,
        iconoClases: 'border-amber-200 bg-amber-100 text-amber-700',
        titulo: 'ITSE Previa (Inspección Técnica Ex-Ante)',
        mensaje:
            'Requiere inspección física in situ previa al otorgamiento de la Licencia de Funcionamiento por un Grupo Inspector especializado acreditado.',
        plazo: 'Hasta 20 días hábiles para subsanar observaciones.',
        detallePlazo:
            'El grupo inspector realiza una diligencia presencial in situ. De existir observaciones subsanables, se otorga un plazo de hasta 20 días hábiles con una segunda verificación presencial in situ para constatar el levantamiento de las observaciones.',
        reprogramacion:
            'Regla de diligencia: La inspección se puede reprogramar por única vez dentro de los 2 días hábiles ante causa justificada debidamente acreditada; la inconcurrencia reiterada acarrea el fin del procedimiento y denegatoria.',
        plazoIcono: Clock,
    },
} as const;

interface TagEspecialista {
    texto: string;
    icono: string;
    clase: string;
}

/**
 * Formatea el nivel de riesgo técnico a texto cívico legible.
 */
function formatearNivelRiesgo(nivel?: string | null): string {
    if (!nivel) return 'Bajo / Medio';
    const normalizado = nivel.toUpperCase().trim();
    switch (normalizado) {
        case 'BAJO_MEDIO':
            return 'Bajo / Medio';
        case 'ALTO_MUY_ALTO':
            return 'Alto / Muy Alto';
        case 'MUY_ALTO':
            return 'Muy Alto';
        case 'ALTO':
            return 'Alto';
        case 'MEDIO':
            return 'Medio';
        case 'BAJO':
            return 'Bajo';
        default:
            return normalizado
                .split('_')
                .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
                .join(' ');
    }
}

/**
 * Asigna un tag sutil del especialista requerido según la disciplina normativa.
 */
function obtenerTagEspecialista(codigo: string, titulo: string, queObservar?: string): TagEspecialista {
    const cod = (codigo || '').toUpperCase().trim();
    const texto = ((titulo || '') + ' ' + (queObservar || '')).toLowerCase();

    // 1. EXTINTORES E INCENDIOS
    if (cod === 'CRIT-01' || cod === 'CRIT-02' || (texto.includes('extintor') && !texto.includes('clase k') && !texto.includes('fritura'))) {
        return {
            texto: 'Proveedor de Extintores NTP / Incendios',
            icono: '🧯',
            clase: 'bg-rose-50 text-rose-900 border-rose-200/90',
        };
    }

    if (cod === 'CRIT-02A' || texto.includes('clase k') || texto.includes('fritura') || texto.includes('aceite')) {
        return {
            texto: 'Proveedor de Extintores Clase K / Incendios',
            icono: '🧯',
            clase: 'bg-rose-50 text-rose-900 border-rose-200/90',
        };
    }

    // 2. SEÑALÉTICA Y PRIMEROS AUXILIOS
    if (cod === 'CRIT-02B' || cod === 'CRIT-09' || texto.includes('señal') || texto.includes('botiquín')) {
        return {
            texto: 'Implementación de Señalética / Rotulación',
            icono: '🏷️',
            clase: 'bg-indigo-50 text-indigo-900 border-indigo-200/90',
        };
    }

    // 3. ARQUITECTURA Y EVACUACIÓN
    if (cod === 'CRIT-04' || (texto.includes('puerta') && (texto.includes('evacuac') || texto.includes('salida')))) {
        return {
            texto: 'Adecuación de Puertas de Evacuación',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    if (cod === 'CRIT-03' || cod === 'CRIT-12' || texto.includes('pasadizo') || texto.includes('evacuac') || texto.includes('aforo')) {
        return {
            texto: 'Adecuación Arquitectónica y Evacuación',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    if (cod === 'CRIT-11' || texto.includes('escalera') || texto.includes('pasamano')) {
        return {
            texto: 'Carpintería / Pasamanos y Antideslizantes',
            icono: '📐',
            clase: 'bg-sky-50 text-sky-900 border-sky-200/90',
        };
    }

    // 4. ELÉCTRICAS
    if (cod === 'CRIT-05' || texto.includes('pozo') || texto.includes('tierra') || texto.includes('puesta a tierra')) {
        return {
            texto: 'Protocolo de Pozo a Tierra (Ing. Colegiado)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-06' || cod === 'CRIT-14A' || texto.includes('tablero') || texto.includes('mandil') || texto.includes('diferencial')) {
        return {
            texto: 'Técnico o Ing. Electricista (Tableros)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-07' || texto.includes('cable') || texto.includes('canaleta') || texto.includes('conduit') || texto.includes('mellizo')) {
        return {
            texto: 'Técnico Electricista (Canalización)',
            icono: '⚡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    if (cod === 'CRIT-08' || texto.includes('luces de emergencia') || texto.includes('luz de emergencia')) {
        return {
            texto: 'Instalación de Luces de Emergencia (Técnico)',
            icono: '💡',
            clase: 'bg-amber-50 text-amber-900 border-amber-200/90',
        };
    }

    // 5. GAS / GLP
    if (cod === 'CRIT-10' || texto.includes('glp') || texto.includes('gas') || texto.includes('caldero')) {
        return {
            texto: 'Técnico Especialista en GLP / Osinergmin',
            icono: '🔥',
            clase: 'bg-orange-50 text-orange-900 border-orange-200/90',
        };
    }

    // 6. ESTRUCTURAL
    if (cod === 'CRIT-13' || texto.includes('estanter') || texto.includes('anclaje') || texto.includes('mobiliario') || texto.includes('volteo')) {
        return {
            texto: 'Adecuación Estructural / Anclaje Antisísmico',
            icono: '🔨',
            clase: 'bg-slate-100 text-slate-800 border-slate-200/90',
        };
    }

    return {
        texto: 'Especialista Técnico Calificado',
        icono: '🔧',
        clase: 'bg-slate-100 text-slate-700 border-slate-200/90',
    };
}

/**
 * Determina la clave de especialidad del Directorio Cívico para pre-filtrar aliados.
 */
function obtenerEspecialidadDirectorio(codigo: string, titulo: string, queObservar?: string): string {
    const cod = (codigo || '').toUpperCase().trim();
    const texto = ((titulo || '') + ' ' + (queObservar || '')).toLowerCase();

    if (
        cod === 'CRIT-01' ||
        cod === 'CRIT-02' ||
        cod === 'CRIT-02A' ||
        texto.includes('extintor') ||
        texto.includes('incendio')
    ) {
        return 'incendios';
    }

    if (
        cod === 'CRIT-05' ||
        cod === 'CRIT-06' ||
        cod === 'CRIT-07' ||
        cod === 'CRIT-08' ||
        cod === 'CRIT-14' ||
        cod === 'CRIT-14A' ||
        texto.includes('pozo') ||
        texto.includes('puesta a tierra') ||
        texto.includes('tablero') ||
        texto.includes('electr') ||
        texto.includes('luz de emergencia') ||
        texto.includes('luces de emergencia')
    ) {
        return 'electricas';
    }

    if (
        cod === 'CRIT-10' ||
        texto.includes('gas') ||
        texto.includes('glp') ||
        texto.includes('calder')
    ) {
        return 'gas';
    }

    if (
        cod === 'CRIT-13' ||
        cod === 'CRIT-15' ||
        texto.includes('vidrio') ||
        texto.includes('estanter') ||
        texto.includes('anclaje') ||
        texto.includes('estructur')
    ) {
        return 'estructuras';
    }

    return 'arquitectura_senaletica';
}

interface AccionCorrectivaOficial {
    norma: string;
    solucionTecnica: string;
    requerimientoProfesional?: string;
}

/**
 * Provee la solución técnica oficial y normativa (D.S. N° 002-2018-PCM / R.J. N° 016-2018-CENEPRED / RNE / CNE)
 * para cada no-conformidad detectada.
 */
function obtenerAccionCorrectivaOficial(
    codigo: string,
    titulo: string,
    queObservar?: string,
    accionBase?: string
): AccionCorrectivaOficial {
    const cod = (codigo || '').toUpperCase().trim();
    const texto = ((titulo || '') + ' ' + (queObservar || '') + ' ' + (accionBase || '')).toLowerCase();

    // CRIT-04: Puertas de evacuación
    if (cod === 'CRIT-04' || (texto.includes('puerta') && (texto.includes('evacuac') || texto.includes('traba') || texto.includes('candado')))) {
        return {
            norma: 'RNE A.130 Arts. 5 y 6 / RNE A.010 Art. 26',
            solucionTecnica:
                'Acondicionar las puertas utilizadas como medios de evacuación para que abran en el sentido del flujo de los evacuantes o permanezcan abiertas en horario de atención, sin pestillos, candados ni trabas que obstruyan la libre salida.',
            requerimientoProfesional: 'Técnico cerrajero / Administrador del local',
        };
    }

    // CRIT-11: Escaleras
    if (cod === 'CRIT-11' || (texto.includes('escalera') && (texto.includes('pasamano') || texto.includes('peldaño') || texto.includes('antideslizante')))) {
        return {
            norma: 'RNE A.010 (Arts. 23 al 31) y RNE A.130 Art. 16',
            solucionTecnica:
                'Colocar pasamanos a ambos lados en escaleras de evacuación (ancho 1.20 m a 2.40 m) e instalar bandas o acabados antideslizantes de alto tránsito en los peldaños.',
            requerimientoProfesional: 'Contratista de acabados / Carpintería metálica',
        };
    }

    // CRIT-06: Tablero eléctrico
    if (cod === 'CRIT-06' || (texto.includes('mandil') || (texto.includes('tablero') && texto.includes('diferencial')))) {
        return {
            norma: 'CNE-U 020.202.1, 070.302 y 020.132 / Reglas 080.010 y 150.400',
            solucionTecnica:
                'Instalar placa de protección (mandil) para cubrir conexiones internas, sellar espacios de reserva con tapas ciegas e instalar interruptores diferenciales (30 mA) en todos los circuitos derivados.',
            requerimientoProfesional: 'Técnico Electricista calificado o Ing. Electricista colegiado',
        };
    }

    // CRIT-02B: Señalización básica
    if (cod === 'CRIT-02B' || (texto.includes('señal') && (texto.includes('evacuac') || texto.includes('fotoluminiscente') || texto.includes('salida')))) {
        return {
            norma: 'NTP 399.010-1 y RNE A.130 Art. 39',
            solucionTecnica:
                'Implementar señalización de seguridad fotoluminiscente normalizada (direccionales de salida, zona segura en caso de sismo, riesgo eléctrico y ubicación de extintores).',
            requerimientoProfesional: 'Proveedor de señalética de seguridad / Administrador',
        };
    }

    // CRIT-01: Extintores PQS
    if (cod === 'CRIT-01' || (texto.includes('extintor') && !texto.includes('clase k') && !texto.includes('fritura'))) {
        return {
            norma: 'NTP 350.043-1 / RNE A.130 Art. 163',
            solucionTecnica:
                'Efectuar recarga o mantenimiento preventivo anual con empresa autorizada de extintores, comprobar manómetro en franja verde y fijar el equipo a una altura máxima de 1.50 m con tarjeta de control vigente y señalética superior visible.',
            requerimientoProfesional: 'Empresa autorizada de mantenimiento y recarga de extintores',
        };
    }

    // CRIT-02A: Extintor especializado Clase K
    if (cod === 'CRIT-02A' || texto.includes('clase k') || texto.includes('fritura') || texto.includes('aceite')) {
        return {
            norma: 'RNE A.130 Art. 165 / NTP 350.043-1 num. 8.1.4',
            solucionTecnica:
                'Instalar un extintor de Acetato de Potasio (Clase K) a no más de 9 metros de los equipos de fritura o cocción comercial con aceites, con tarjeta de control y mantenimiento vigente por empresa recargadora autorizada.',
            requerimientoProfesional: 'Proveedor acreditado de extintores Clase K',
        };
    }

    // CRIT-03: Rutas y pasadizos de evacuación libres de obstáculos
    if (cod === 'CRIT-03' || (texto.includes('pasadizo') || (texto.includes('ruta') && texto.includes('evacuac')))) {
        return {
            norma: 'RNE Norma A.010 Art. 25 / RNE Norma A.130 Art. 22',
            solucionTecnica:
                'Despejar completamente los pasadizos de circulación interna y rutas de evacuación hacia la salida, asegurando un ancho libre continuo mínimo de 1.20 m sin fardos, cajas de mercadería ni mobiliario.',
            requerimientoProfesional: 'Administrador del local / Personal del establecimiento',
        };
    }

    // CRIT-05: Puesta a tierra
    if (cod === 'CRIT-05' || texto.includes('pozo') || texto.includes('puesta a tierra') || texto.includes('resistencia')) {
        return {
            norma: 'CNE Utilización Regla 060.712 / R.J. N° 016-2018 Anexo 4',
            solucionTecnica:
                'Ejecutar mantenimiento preventivo al sistema de puesta a tierra y obtener el Certificado de Medición de Resistencia (≤ 25 Ω) con vigencia no mayor a 1 año, suscrito por Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado.',
            requerimientoProfesional: 'Ingeniero Electricista o Mecánico-Electricista Colegiado',
        };
    }

    // CRIT-07: Cables canalizados, sin cables mellizos
    if (cod === 'CRIT-07' || texto.includes('cable mellizo') || texto.includes('mellizo') || texto.includes('canaliz') || texto.includes('conduit')) {
        return {
            norma: 'CNE Utilización Reglas 010.010 y 070.300',
            solucionTecnica:
                'Erradicar el uso de cables mellizos expuestos y reemplazarlos por conductores no propagadores de llama (NH-80 o THHN) debidamente entubados en conduit PVC pesado o canaletas con tapa y cajas de paso cerradas.',
            requerimientoProfesional: 'Técnico Electricista calificado',
        };
    }

    // CRIT-08: Luces de emergencia autónomas
    if (cod === 'CRIT-08' || texto.includes('luz de emergencia') || texto.includes('luces de emergencia')) {
        return {
            norma: 'RNE Norma A.130 Art. 40 / CNE Utilización Regla 240.202',
            solucionTecnica:
                'Instalar equipos autónomos de alumbrado de emergencia de 2 faros LED con batería recargable que garantice al menos 90 minutos de autonomía, conectados permanentemente al circuito de iluminación de la zona en pasadizos, escaleras y puertas de salida.',
            requerimientoProfesional: 'Técnico electricista calificado',
        };
    }

    // CRIT-10: Instalación segura de GLP
    if (cod === 'CRIT-10' || texto.includes('glp') || texto.includes('balón') || texto.includes('gas') || texto.includes('caldero')) {
        return {
            norma: 'D.S. N° 027-94-EM Arts. 45 y 48 / NTP 321.123',
            solucionTecnica:
                'Ubicar balones de gas GLP en lugares ventilados a nivel del terreno (terminantemente prohibidos en sótanos o semisótanos), alejados a más de 0.50 m de tomacorrientes e interruptores eléctricos. Emplear reguladores y mangueras con certificación técnica para GLP.',
            requerimientoProfesional: 'Instalador de gas registrado / Técnico calificado',
        };
    }

    // CRIT-13: Mobiliario alto y estanterías con arriostramiento antisísmico
    if (cod === 'CRIT-13' || texto.includes('estanter') || texto.includes('anclaje') || texto.includes('volteo') || texto.includes('rack')) {
        return {
            norma: 'RNE Norma E.030 Cap. 9 (Elementos No Estructurales)',
            solucionTecnica:
                'Efectuar anclaje mecánico rígido de estanterías, vitrinas y racks con altura mayor a 1.80 m fijándolos a muros portantes o losa mediante escuadras metálicas o pernos de expansión para prevenir colapso sísmico sobre pasadizos.',
            requerimientoProfesional: 'Técnico de montaje y adecuación estructural',
        };
    }

    // CRIT-14A: Espacio libre frente al tablero eléctrico
    if (cod === 'CRIT-14A' || (texto.includes('espacio libre') && texto.includes('tablero'))) {
        return {
            norma: 'CNE Utilización Regla 020.024',
            solucionTecnica:
                'Garantizar un espacio de trabajo frontal continuo de al menos 1.00 metro de profundidad y ancho libre frente al tablero eléctrico, retirando cualquier mercadería o material combustible.',
            requerimientoProfesional: 'Administrador del local / Personal del establecimiento',
        };
    }

    // DEFAULT / FALLBACK
    return {
        norma: 'D.S. N° 002-2018-PCM / Manual CENEPRED',
        solucionTecnica:
            accionBase ||
            'Implementar la adecuación física y documental conforme a las especificaciones técnicas del Manual CENEPRED.',
        requerimientoProfesional: 'Responsable técnico del establecimiento',
    };
}

interface EstimacionItem {
    codigo: string;
    titulo: string;
    rubro: string;
    min: number;
    max: number;
}

const ESTIMACION_COSTOS_REFERENCIALES: Record<string, { min: number; max: number; rubro: string }> = {
    'CRIT-01': { min: 35, max: 50, rubro: 'Mantenimiento / recarga de extintor PQS' },
    'CRIT-02A': { min: 140, max: 220, rubro: 'Extintor químico húmedo especializado Clase K' },
    'CRIT-02B': { min: 25, max: 45, rubro: 'Kit de señales fotoluminiscentes de seguridad' },
    'CRIT-03': { min: 0, max: 30, rubro: 'Despeje y señalización de anchos de paso' },
    'CRIT-04': { min: 40, max: 120, rubro: 'Cerrajería / manija de escape o adecuación de puerta' },
    'CRIT-05': { min: 180, max: 260, rubro: 'Protocolo de medición de pozo a tierra CIP (≤25 Ω)' },
    'CRIT-06': { min: 80, max: 130, rubro: 'Mandil de tablero + interruptor diferencial 30mA' },
    'CRIT-07': { min: 60, max: 140, rubro: 'Canaletas PVC + sustitución de cables mellizos' },
    'CRIT-08': { min: 60, max: 100, rubro: 'Luminaria autónoma de emergencia recargable' },
    'CRIT-10': { min: 30, max: 50, rubro: 'Manguera reforzada para GLP y abrazaderas metálicas' },
    'CRIT-11': { min: 50, max: 120, rubro: 'Pasamanos continuo y cintas antideslizantes para escalera' },
    'CRIT-13': { min: 30, max: 70, rubro: 'Arriostramiento antisísmico / escuadras para estanterías' },
    'CRIT-14A': { min: 0, max: 20, rubro: 'Despeje frontal libre de 1 m de tablero eléctrico' },
};

const COSTO_DEFECTO = { min: 50, max: 100, rubro: 'Adecuación técnica preventiva' };

function calcularEstimacionEconomica(observaciones: { codigo: string; titulo: string }[]): {
    minTotal: number;
    maxTotal: number;
    promedioTotal: number;
    items: EstimacionItem[];
} {
    if (observaciones.length === 0) {
        return { minTotal: 0, maxTotal: 0, promedioTotal: 0, items: [] };
    }

    const items: EstimacionItem[] = observaciones.map((obs) => {
        const est = ESTIMACION_COSTOS_REFERENCIALES[obs.codigo] ?? COSTO_DEFECTO;
        return {
            codigo: obs.codigo,
            titulo: obs.titulo,
            rubro: est.rubro,
            min: est.min,
            max: est.max,
        };
    });

    const minTotal = items.reduce((acc, it) => acc + it.min, 0);
    const maxTotal = items.reduce((acc, it) => acc + it.max, 0);
    const promedioTotal = Math.round((minTotal + maxTotal) / 2);

    return { minTotal, maxTotal, promedioTotal, items };
}

export default function Resumen({
    autoevaluacion,
    resumen = {
        total_criterios_aplicables: 0,
        total_cumple_declarado: 0,
        total_pendiente_atender: 0,
        total_por_revisar: 0,
        total_no_aplica: 0,
    },
    pendiente_atender = [],
    por_revisar = [],
    cumple_declarado = [],
    no_aplica = [],
    desglose_especialidades = null,
    clasificacion_tramite = null,
}: ResumenProps) {
    const { auth } = usePage().props as { auth?: { user: { id?: number; name?: string; email?: string; [key: string]: unknown } | null } };
    const [mostrarModalGuardar, setMostrarModalGuardar] = useState<boolean>(false);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState<boolean>(false);
    const [mostrarFichaDeclarada, setMostrarFichaDeclarada] = useState<boolean>(false);
    const [mostrarPuntosFuertes, setMostrarPuntosFuertes] = useState<boolean>(true);
    const [mostrarNoAplica, setMostrarNoAplica] = useState<boolean>(false);
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
    const [criterioSeleccionadoParaAsistencia, setCriterioSeleccionadoParaAsistencia] =
        useState<CriterioAsistencia | null>(null);
    const [modalHojaModeloAbierto, setModalHojaModeloAbierto] = useState<boolean>(false);

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

    const modalidadTramite = useMemo(() => {
        if (!clasificacion_tramite) return null;

        const tipo = String(clasificacion_tramite.tipo_tramite ?? '').toUpperCase();
        const contenido = MODALIDAD_TRAMITE[tipo as keyof typeof MODALIDAD_TRAMITE];
        if (!contenido) return null;

        return {
            contenido,
            nivelRiesgo: formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo),
            motivos: Array.isArray(clasificacion_tramite.motivos) ? clasificacion_tramite.motivos : [],
            fuente: clasificacion_tramite.fuente,
        };
    }, [clasificacion_tramite]);

    const caracteristicasDeclaradas = useMemo(() => {
        const fuente = autoevaluacion?.caracteristicas_declaradas;
        if (!fuente || typeof fuente !== 'object') return [];

        return Object.entries(fuente)
            .filter(([clave, valor]) => Boolean(CARACTERISTICAS_DECLARADAS[clave]) && valor !== null && valor !== undefined)
            .filter(([clave]) => clave !== 'galones_glp' || (fuente as Record<string, unknown>).usa_glp === true)
            .filter(([clave]) => clave !== 'combustibles_liquidos_m3' || (fuente as Record<string, unknown>).usa_liquidos_inflamables === true)
            .map(([clave, valor]) => {
                const descriptor = CARACTERISTICAS_DECLARADAS[clave];
                const texto = valor === true ? 'Sí' : valor === false ? 'No' : `${valor}${descriptor.sufijo ?? ''}`;
                return { clave, etiqueta: descriptor.etiqueta, texto };
            });
    }, [autoevaluacion?.caracteristicas_declaradas]);

    const totalAplicables = resumen?.total_criterios_aplicables ?? 0;
    const totalPendientes = (resumen?.total_pendiente_atender ?? 0) + (resumen?.total_por_revisar ?? 0);
    const esApto = totalPendientes === 0;

    // Cálculo proporcional visual para la barra de salud técnica
    const pctCumple = totalAplicables > 0 ? ((resumen?.total_cumple_declarado ?? 0) / totalAplicables) * 100 : 0;
    const pctPendiente = totalAplicables > 0 ? ((resumen?.total_pendiente_atender ?? 0) / totalAplicables) * 100 : 0;
    const pctRevisar = totalAplicables > 0 ? ((resumen?.total_por_revisar ?? 0) / totalAplicables) * 100 : 0;

    // Determinación del nivel de riesgo estimado para el Hero
    const nivelRiesgoTexto = useMemo(() => {
        if (clasificacion_tramite?.nivel_riesgo) {
            return formatearNivelRiesgo(clasificacion_tramite.nivel_riesgo);
        }
        if ((resumen?.total_pendiente_atender ?? 0) > 0) {
            return 'Alto';
        }
        if ((resumen?.total_por_revisar ?? 0) > 0) {
            return 'Medio';
        }
        return 'Bajo / Medio';
    }, [clasificacion_tramite, resumen]);

    const esRiesgoAlto = useMemo(() => {
        const nr = String(clasificacion_tramite?.nivel_riesgo ?? '').toUpperCase();
        if (nr.includes('ALTO') || nr === 'MUY_ALTO' || nr === 'ALTO_MUY_ALTO') return true;
        if (clasificacion_tramite?.tipo_tramite === 'EX_ANTE') return true;
        return (resumen?.total_pendiente_atender ?? 0) > 0;
    }, [clasificacion_tramite, resumen?.total_pendiente_atender]);

    const esModalidadExAnte = useMemo(() => {
        if (clasificacion_tramite) {
            return clasificacion_tramite.tipo_tramite === 'EX_ANTE';
        }
        return esRiesgoAlto;
    }, [clasificacion_tramite, esRiesgoAlto]);

    const estimacionEconomica = useMemo(() => {
        return calcularEstimacionEconomica(pendiente_atender);
    }, [pendiente_atender]);

    const abrirRecurso = (item: { codigo: string; titulo: string; recursos_educativos?: RecursoEducativoData[] }) => {
        setModalRecurso({
            isOpen: true,
            recursos: item.recursos_educativos || [],
            codigo: item.codigo,
            titulo: item.titulo,
        });
    };

    const abrirAsistencia = (asistencia: CriterioAsistencia) => {
        setCriterioSeleccionadoParaAsistencia(asistencia);
    };

    const botonVerSolucion = (
        asistencia?: CriterioAsistencia | null,
        codigoCriterio?: string,
        tituloCriterio?: string,
        queObservar?: string
    ) => {
        const tieneAliados =
            asistencia && Array.isArray(asistencia.aliados) && asistencia.aliados.length > 0;
        const especialidadSlug = obtenerEspecialidadDirectorio(
            codigoCriterio || '',
            tituloCriterio || '',
            queObservar
        );

        return (
            <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
                {tieneAliados && (
                    <button
                        type="button"
                        onClick={() => abrirAsistencia(asistencia)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                    >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Ver especialistas sugeridos</span>
                    </button>
                )}
                <Link
                    href={route('directorio.index', { especialidad: especialidadSlug })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors shrink-0"
                    title="Explorar especialistas habilitados para este rubro en el Directorio Cívico"
                >
                    <Store className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver en Directorio</span>
                </Link>
            </div>
        );
    };

    const handleFinalizar = async () => {
        setFinalizando(true);
        setErrorFinalizar(null);
        setPendientesFinalizar([]);

        try {
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
            <Head title="Diagnóstico de Autoevaluación ITSE - CheckITSE Huancayo" />

            <div className="relative min-h-screen bg-slate-50/70 py-6 sm:py-8 font-sans">
                {/* Capa de textura cuadriculada sutil */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-slate-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-slate-200)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_15%,transparent_100%)] print:hidden"
                />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 print:max-w-none print:p-0 print:space-y-4">
                    {/* ========================================================================= */}
                    {/* ENCABEZADO EXCLUSIVO PARA IMPRESIÓN (A4)                                  */}
                    {/* ========================================================================= */}
                    <div className="hidden print:block mb-4 border-b border-slate-300 pb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                                    RESUMEN PREVENTIVO DE AUTOEVALUACIÓN CÍVICA
                                </h1>
                                <p className="text-xs text-slate-600 font-medium">
                                    Herramienta Ciudadana de Prevención y Orientación Técnica — CheckITSE Huancayo
                                </p>
                            </div>
                            {autoevaluacion.registrada_at && (
                                <div className="text-right text-xs text-slate-700">
                                    <span className="font-semibold">Fecha y hora de registro:</span>
                                    <br />
                                    {autoevaluacion.registrada_at}
                                </div>
                            )}
                        </div>

                        {/* Ficha del Establecimiento en Impresión */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-200 pt-2">
                            <div>
                                <span className="font-semibold text-slate-700">Establecimiento: </span>
                                <span className="text-slate-900">{autoevaluacion?.nombre_comercio || 'No declarado'}</span>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-700">Giro o Actividad: </span>
                                <span className="text-slate-900">{autoevaluacion?.funcion_economica || 'No declarada'}</span>
                            </div>
                            {autoevaluacion?.ruc && (
                                <div>
                                    <span className="font-semibold text-slate-700">RUC: </span>
                                    <span className="font-mono text-slate-900">{autoevaluacion.ruc}</span>
                                </div>
                            )}
                            {autoevaluacion?.direccion && (
                                <div>
                                    <span className="font-semibold text-slate-700">Dirección: </span>
                                    <span className="text-slate-900">{autoevaluacion.direccion}</span>
                                </div>
                            )}
                            {autoevaluacion?.codigo_acceso && (
                                <div>
                                    <span className="font-semibold text-slate-700">Código de acceso CheckITSE: </span>
                                    <span className="font-mono font-bold text-slate-900">{autoevaluacion.codigo_acceso}</span>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold text-slate-700">Estado: </span>
                                <span className="font-medium text-slate-900">{esRegistrada ? 'REGISTRADA (Protegida contra modificaciones)' : 'INICIADA (En edición)'}</span>
                            </div>
                        </div>

                        <div className="mt-3 rounded border border-slate-400 p-2.5 text-[10.5px] text-slate-800 leading-relaxed bg-white">
                            <p className="font-bold uppercase mb-1 text-black">
                                DECLARACIÓN CIUDADANA PREVENTIVA — NO CONSTITUYE INSPECCIÓN MUNICIPAL
                            </p>
                            <p>
                                Este documento refleja única y exclusivamente las condiciones de seguridad declaradas por el responsable del establecimiento a través de la plataforma comunitaria CheckITSE Huancayo. No acredita el cumplimiento de la normativa ITSE, no otorga autorización, licencia ni habilitación municipal alguna, y no reemplaza la inspección técnica oficial de la Municipalidad Provincial de Huancayo.
                            </p>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* BARRA SUPERIOR DE FLUJO CÍVICO (Oculta en Impresión)                      */}
                    {/* ========================================================================= */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3 print:hidden">
                        <Link
                            href={route('autoevaluacion.index')}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-400" />
                            <span>Volver a la Portada Cívica</span>
                        </Link>

                        <ol
                            aria-label="Flujo de autoevaluación: 1. Calcular riesgo, 2. Simulacro en vivo, 3. Diagnóstico Técnico"
                            className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-bold"
                        >
                            {PASOS_FLUJO.map((paso, indice) => {
                                const activo = paso.estado === 'activo';
                                const completado = paso.estado === 'completado';
                                return (
                                    <li key={paso.numero} className="flex items-center gap-1.5">
                                        <div
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition ${
                                                activo
                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                    : completado
                                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                      : 'bg-white border border-slate-200 text-slate-400'
                                            }`}
                                        >
                                            {completado ? (
                                                <Check className="w-3 h-3 stroke-[3]" />
                                            ) : (
                                                <span className="font-mono text-[10px]">{paso.numero}</span>
                                            )}
                                            <span>{paso.titulo}</span>
                                        </div>
                                        {indice < PASOS_FLUJO.length - 1 && <span className="text-slate-300">›</span>}
                                    </li>
                                );
                            })}
                        </ol>

                        <div className="flex items-center gap-2">
                            {!auth?.user && (
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalGuardar(true)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    <span>Guardar en mi cuenta</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                            >
                                <Printer className="h-3.5 w-3.5 text-slate-500" />
                                <span>Imprimir</span>
                            </button>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* A. HERO BANNER DEL SEMÁFORO DE RIESGO (Cabecera Superior Masiva)          */}
                    {/* ========================================================================= */}
                    <section
                        aria-label="Diagnóstico técnico preventivo y nivel de riesgo"
                        className={`rounded-3xl border-2 p-6 sm:p-8 shadow-xs transition-all print:border-slate-300 print:bg-white print:p-4 ${
                            esRiesgoAlto
                                ? 'border-rose-200/90 bg-gradient-to-br from-rose-50/80 via-white to-red-50/40 text-rose-950'
                                : 'border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 text-emerald-950'
                        }`}
                    >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="space-y-3.5 max-w-3xl">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border shadow-2xs ${
                                            esRiesgoAlto
                                                ? 'border-rose-300 bg-rose-100/80 text-rose-800'
                                                : 'border-emerald-300 bg-emerald-100/80 text-emerald-800'
                                        }`}
                                    >
                                        {esRiesgoAlto ? (
                                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                        ) : (
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        )}
                                        DIAGNÓSTICO TÉCNICO PREVENTIVO — MUNICIPALIDAD DE HUANCAYO
                                    </span>

                                    {autoevaluacion?.codigo_acceso && (
                                        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-700 bg-white/90 border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs select-all">
                                            <Hash className="w-3 h-3 text-slate-400" />
                                            {autoevaluacion.codigo_acceso}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
                                        Nivel de Riesgo Estimado:{' '}
                                        <span
                                            className={
                                                esRiesgoAlto
                                                    ? 'text-rose-600 underline decoration-rose-300 decoration-wavy decoration-2'
                                                    : 'text-emerald-700'
                                            }
                                        >
                                            {nivelRiesgoTexto}
                                        </span>
                                    </h1>
                                    <p className="mt-2 text-sm sm:text-base font-bold leading-relaxed text-slate-800">
                                        {esRiesgoAlto
                                            ? 'Tu establecimiento presenta observaciones críticas que impedirían la obtención de la ITSE en una inspección real. Revisa el plan de subsanación priorizado abajo.'
                                            : 'Tu establecimiento presenta un nivel de seguridad adecuado para tramitar tu Licencia de Funcionamiento con inspección posterior.'}
                                    </p>
                                </div>

                                {/* Metadata limpia en pastillas sutiles */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-700">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs font-bold text-slate-900">
                                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                        {autoevaluacion?.nombre_comercio || 'Local Comercial'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs font-semibold">
                                        <Store className="w-3.5 h-3.5 text-slate-500" />
                                        {autoevaluacion?.funcion_economica || 'Comercio General'}
                                    </span>
                                    {autoevaluacion?.direccion && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="truncate max-w-[220px]">{autoevaluacion.direccion}</span>
                                        </span>
                                    )}
                                    {autoevaluacion?.ruc && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs font-mono">
                                            <span className="text-slate-400">RUC:</span> {autoevaluacion.ruc}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Badge lateral de veredicto rápido */}
                            <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-center p-4 sm:p-5 rounded-2xl bg-white/90 border border-slate-200 shadow-xs sm:w-48 text-center gap-2">
                                <div
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                                        esRiesgoAlto ? 'bg-rose-500' : 'bg-emerald-600'
                                    }`}
                                >
                                    {esRiesgoAlto ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                                </div>
                                <div className="text-left sm:text-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                                        Estado Veredicto
                                    </span>
                                    <span
                                        className={`text-sm sm:text-base font-black ${
                                            esRiesgoAlto ? 'text-rose-700' : 'text-emerald-700'
                                        }`}
                                    >
                                        {esApto ? 'APTO PARA ITSE' : 'REQUIERE SUBSANACIÓN'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* B. BARRA DE SALUD TÉCNICA Y MÉTRICAS PROPORCIONALES (Bento Superior)       */}
                    {/* ========================================================================= */}
                    <section
                        aria-labelledby="salud-tecnica-title"
                        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs print:border-slate-300 print:shadow-none print:p-4"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                                <h2 id="salud-tecnica-title" className="text-base font-bold text-slate-900">
                                    Índice de Preparación y Salud Técnica del Local
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Distribución descriptiva sobre {totalAplicables} condiciones normativas aplicables a tu actividad.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
                                {totalAplicables} Condiciones Evaluadas
                            </span>
                        </div>

                        {/* Barra segmentada continua estilo Health / Audit bar */}
                        <div className="my-5">
                            <div
                                aria-label="Barra de proporción de cumplimiento"
                                className="h-3 rounded-full overflow-hidden flex bg-slate-100 shadow-inner p-0.5 gap-0.5"
                            >
                                {pctCumple > 0 && (
                                    <div
                                        style={{ width: `${pctCumple}%` }}
                                        className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
                                        title={`Cumple declarado: ${resumen?.total_cumple_declarado ?? 0}`}
                                    />
                                )}
                                {pctPendiente > 0 && (
                                    <div
                                        style={{ width: `${pctPendiente}%` }}
                                        className="h-full bg-rose-500 transition-all duration-700"
                                        title={`Por subsanar: ${resumen?.total_pendiente_atender ?? 0}`}
                                    />
                                )}
                                {pctRevisar > 0 && (
                                    <div
                                        style={{ width: `${pctRevisar}%` }}
                                        className="h-full bg-sky-500 rounded-r-full transition-all duration-700"
                                        title={`Por verificar: ${resumen?.total_por_revisar ?? 0}`}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Bento KPI Cards: 3 tarjetas métricas destacadas */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-2xl font-black text-emerald-950 block leading-tight">
                                        {resumen?.total_cumple_declarado ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-800">
                                        Condiciones Cumplen
                                    </span>
                                    <span className="text-[10px] text-emerald-700/80 block">
                                        Declaración cívica conforme
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-2xs">
                                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 shadow-2xs">
                                    <AlertTriangle className="w-6 h-6 text-rose-700" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-2xl font-black text-rose-950 block leading-tight">
                                        {resumen?.total_pendiente_atender ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-rose-800">
                                        Por Subsanar
                                    </span>
                                    <span className="text-[10px] text-rose-700/80 block">
                                        Requieren atención urgente
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3.5 p-4 rounded-2xl border border-sky-200 bg-sky-50/50 shadow-2xs">
                                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 shadow-2xs">
                                    <HelpCircle className="w-6 h-6 text-sky-700" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-2xl font-black text-sky-950 block leading-tight">
                                        {resumen?.total_por_revisar ?? 0}
                                    </span>
                                    <span className="text-xs font-bold text-sky-800">
                                        Por Verificar
                                    </span>
                                    <span className="text-[10px] text-sky-700/80 block">
                                        Revisión técnica sugerida
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ========================================================================= */}
                    {/* B.2 DIAGNÓSTICO ANALÍTICO MULTIDIMENSIONAL (CENEPRED Anexo 17)            */}
                    {/* ========================================================================= */}
                    <DiagnosticoMultidimensional
                        desglose={desglose_especialidades}
                        pendientes={pendiente_atender}
                        porRevisar={por_revisar}
                        cumple={cumple_declarado}
                        clasificacion={clasificacion_tramite}
                        nombreComercio={autoevaluacion?.nombre_comercio}
                    />

                    {/* ========================================================================= */}
                    {/* C. LAYOUT BENTO GRID DE 2 COLUMNAS (Cuerpo Central)                       */}
                    {/* ========================================================================= */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* COLUMNA IZQUIERDA (60% - Ancha): PLAN DE SUBSANACIÓN Y CUMPLIMIENTO */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* BLOQUE 1: PLAN DE SUBSANACIÓN PRIORIZADO (Tarjeta de Alerta) */}
                            <section
                                aria-labelledby="subsanacion-title"
                                className="rounded-3xl border border-rose-200 bg-rose-50/30 p-5 sm:p-6 shadow-xs space-y-4 print:border-slate-300 print:bg-white print:p-4"
                            >
                                <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                                            <AlertTriangle className="h-5 w-5 text-rose-700" />
                                        </div>
                                        <div>
                                            <h2 id="subsanacion-title" className="text-base font-bold text-slate-900">
                                                Plan de Subsanación Urgente
                                            </h2>
                                            <p className="text-xs text-slate-600">
                                                Criterios que presentan observaciones y requieren intervención técnica.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                            {resumen?.total_pendiente_atender ?? 0} observaciones
                                        </span>
                                        <Link
                                            href={route('directorio.index')}
                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-bold text-rose-800 shadow-2xs hover:bg-rose-50 transition-colors print:hidden"
                                        >
                                            <Store className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Directorio</span>
                                        </Link>
                                    </div>
                                </div>

                                {pendiente_atender.length === 0 ? (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-1.5">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                                        <p className="text-sm font-bold text-emerald-950">
                                            ¡Sin observaciones críticas pendientes!
                                        </p>
                                        <p className="text-xs text-emerald-800">
                                            No declaraste condiciones en estado pendiente de atención preventiva.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {pendiente_atender.map((item) => {
                                            const tag = obtenerTagEspecialista(item.codigo, item.titulo, item.que_observar);
                                            return (
                                                <div
                                                    key={item.codigo}
                                                    className="rounded-2xl border border-rose-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3 print:border-slate-300 print:shadow-none print:p-3"
                                                >
                                                    {/* Cabecera del Criterio con Tag de Especialista */}
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                                                {item.codigo}
                                                            </span>
                                                            <span
                                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${tag.clase}`}
                                                            >
                                                                <span>{tag.icono}</span>
                                                                <span>{tag.texto}</span>
                                                            </span>
                                                        </div>

                                                        {(item.norma_base || item.articulo_referencia) && (
                                                            <span className="text-[11px] font-medium text-slate-500">
                                                                {item.norma_base}
                                                                {item.articulo_referencia && ` (${item.articulo_referencia})`}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                                        {item.titulo}
                                                    </h3>

                                                    {item.que_observar && (
                                                        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                                                            <strong className="text-slate-900 font-bold block mb-0.5">
                                                                Qué observar en el establecimiento:
                                                            </strong>
                                                            {item.que_observar}
                                                        </div>
                                                    )}

                                                    {item.accion_mejora_orientativa && (
                                                        <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-amber-950 border border-amber-200/80">
                                                            <strong className="text-amber-900 font-bold block mb-0.5">
                                                                Acción de corrección prioritaria:
                                                            </strong>
                                                            {item.accion_mejora_orientativa}
                                                        </div>
                                                    )}

                                                    {/* Solución Técnica Oficial según CENEPRED / RNE / CNE */}
                                                    {(() => {
                                                        const accionOficial = obtenerAccionCorrectivaOficial(
                                                            item.codigo,
                                                            item.titulo,
                                                            item.que_observar,
                                                            item.accion_mejora_orientativa
                                                        );
                                                        return (
                                                            <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 text-xs border border-slate-800 space-y-1.5 shadow-2xs">
                                                                <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800 pb-1.5">
                                                                    <div className="flex items-center gap-1.5 font-bold text-amber-400 text-[11px] uppercase tracking-wider">
                                                                        <Wrench className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                                                        <span>Solución Técnica Oficial (CENEPRED / RNE)</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                                                        {accionOficial.norma}
                                                                    </span>
                                                                </div>
                                                                <p className="text-slate-200 leading-relaxed font-normal">
                                                                    {accionOficial.solucionTecnica}
                                                                </p>
                                                                {accionOficial.requerimientoProfesional && (
                                                                    <div className="text-[11px] text-slate-400 pt-0.5 flex flex-wrap items-center gap-1">
                                                                        <span className="font-semibold text-slate-300">Responsable recomendado:</span>
                                                                        <span className="text-amber-300/90">{accionOficial.requerimientoProfesional}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}

                                                    <CajaNotasSubsanacion
                                                        codigo={item.codigo}
                                                        uuid={autoevaluacion?.uuid}
                                                        notaInicial={item.notas}
                                                        placeholder="Escribe recordatorios de subsanación (ej. contacto del técnico, cotización, fecha de reparación)..."
                                                    />

                                                    {/* Botonera de Asistencia y Recursos */}
                                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                                        {item.recursos_educativos && item.recursos_educativos.length > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirRecurso(item)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                                                            >
                                                                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Guía pedagógica ({item.recursos_educativos.length})</span>
                                                            </button>
                                                        ) : (
                                                            <span />
                                                        )}

                                                        {botonVerSolucion(
                                                            item.asistencia_tecnica,
                                                            item.codigo,
                                                            item.titulo,
                                                            item.que_observar
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            {/* BLOQUE ESTIMADOR ECONÓMICO: INVERSIÓN PREVENTIVA VS. SANCIÓN MUNICIPAL */}
                            <section
                                aria-labelledby="estimador-economico-title"
                                className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 sm:p-6 shadow-xs space-y-4 print:border-slate-300 print:bg-white print:p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200">
                                            <Coins className="h-5 w-5 text-amber-800" />
                                        </div>
                                        <div>
                                            <h2 id="estimador-economico-title" className="text-base font-bold text-slate-900">
                                                Estimación de Inversión Preventiva vs. Multa Municipal
                                            </h2>
                                            <p className="text-xs text-slate-600">
                                                Comparativa económica de subsanación técnica local frente al Régimen de Aplicación de Sanciones (RAS Huancayo).
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-2.5 py-1 rounded-full">
                                        CUIS / Ley N° 27972
                                    </span>
                                </div>

                                {pendiente_atender.length === 0 ? (
                                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-emerald-950">
                                                🛡️ Blindaje Económico: Cero Riesgo de Clausura Preventiva
                                            </p>
                                            <p className="text-xs text-emerald-900 leading-relaxed">
                                                Tu establecimiento no registra observaciones preventivas pendientes. Al operar cumpliendo las condiciones de seguridad en edificaciones, evitas sanciones municipales de <strong>0.50 a 1.00 UIT (S/ 2,675 a S/ 5,350)</strong> y la paralización de tu negocio por clausura temporal administrativa.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            {/* Tarjeta 1: Inversión Preventiva Estimada */}
                                            <div className="rounded-2xl border border-emerald-300/80 bg-white p-4 shadow-2xs space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-emerald-900 uppercase tracking-wide text-[10px]">
                                                        Inversión Preventiva Estimada
                                                    </span>
                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                                                        Mercado Huancayo
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-black text-emerald-950 font-mono">
                                                        S/ {estimacionEconomica.minTotal} — S/ {estimacionEconomica.maxTotal}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-snug">
                                                    Costo referencial promedio de subsanación: <strong className="text-slate-800 font-semibold font-mono">~S/ {estimacionEconomica.promedioTotal}</strong> (materiales normalizados y mano de obra técnica local para {pendiente_atender.length} observación{pendiente_atender.length > 1 ? 'es' : ''}).
                                                </p>
                                            </div>

                                            {/* Tarjeta 2: Sanción Municipal por Falta de ITSE */}
                                            <div className="rounded-2xl border border-rose-300/80 bg-rose-50/50 p-4 shadow-2xs space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-bold text-rose-900 uppercase tracking-wide text-[10px]">
                                                        Sanción / Clausura Municipal
                                                    </span>
                                                    <span className="text-[10px] text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                                                        0.50 — 1.00 UIT
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-2xl font-black text-rose-950 font-mono">
                                                        S/ 2,675 — S/ 5,350
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-rose-900 leading-snug">
                                                    Multa administrativa municipal aplicable por operar sin condiciones de seguridad + <strong>Clausura Temporal Inmediata</strong> y cese de ingresos comerciales.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Desglose individual de costos por criterio observado */}
                                        <div className="rounded-2xl border border-amber-200 bg-white p-3.5 space-y-2">
                                            <span className="text-[11px] font-bold text-slate-800 block">
                                                Desglose orientativo por criterio observado:
                                            </span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                {estimacionEconomica.items.map((it) => (
                                                    <div
                                                        key={it.codigo}
                                                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100"
                                                    >
                                                        <div className="min-w-0">
                                                            <span className="font-mono text-[10px] font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                                                                {it.codigo}
                                                            </span>
                                                            <span className="text-slate-700 text-[11px] truncate inline-block max-w-[170px] sm:max-w-[190px] align-middle" title={it.rubro}>
                                                                {it.rubro}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono font-bold text-emerald-800 text-[11px] shrink-0">
                                                            S/ {it.min} - {it.max}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Callout de Retorno de la Prevención */}
                                        <div className="rounded-xl border border-amber-300 bg-amber-100/60 p-3 flex items-start gap-2.5">
                                            <TrendingDown className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-950 leading-relaxed">
                                                <strong>Retorno de la Prevención:</strong> Subsanar estas observaciones antes de la fiscalización municipal cuesta aproximadamente <strong>{Math.round(2675 / Math.max(1, estimacionEconomica.promedioTotal))} veces menos</strong> que el monto mínimo de una multa municipal (S/ 2,675), asegurando la continuidad operativa ininterrumpida de tu negocio en Huancayo.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* BLOQUE 2: ASPECTOS POR REVISAR O VERIFICAR (Si existen) */}
                            {por_revisar.length > 0 && (
                                <section
                                    aria-labelledby="por-revisar-title"
                                    className="rounded-3xl border border-sky-200 bg-sky-50/30 p-5 sm:p-6 shadow-xs space-y-4 print:border-slate-300 print:bg-white print:p-4"
                                >
                                    <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                                                <HelpCircle className="h-5 w-5 text-sky-700" />
                                            </div>
                                            <div>
                                                <h2 id="por-revisar-title" className="text-base font-bold text-slate-900">
                                                    Aspectos con Verificación Pendiente
                                                </h2>
                                                <p className="text-xs text-slate-600">
                                                    Condiciones que requieren corroboración con un especialista calificado.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                                                {resumen?.total_por_revisar ?? 0} por verificar
                                            </span>
                                            <Link
                                                href={route('directorio.index')}
                                                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-xs font-bold text-sky-800 shadow-2xs hover:bg-sky-50 transition-colors print:hidden"
                                            >
                                                <Store className="w-3.5 h-3.5 text-sky-600" />
                                                <span>Directorio</span>
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="space-y-3.5">
                                        {por_revisar.map((item) => {
                                            const tag = obtenerTagEspecialista(item.codigo, item.titulo, item.que_observar);
                                            return (
                                                <div
                                                    key={item.codigo}
                                                    className="rounded-2xl border border-sky-200/90 bg-white p-4 shadow-2xs space-y-3 print:border-slate-300 print:p-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                {item.codigo}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tag.clase}`}>
                                                                <span>{tag.icono}</span>
                                                                <span>{tag.texto}</span>
                                                            </span>
                                                        </div>
                                                        {item.norma_base && (
                                                            <span className="text-[11px] text-slate-500">
                                                                {item.norma_base}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-sm font-bold text-slate-900">{item.titulo}</h3>

                                                    {item.orientacion && (
                                                        <div className="rounded-xl bg-sky-50/70 p-3 text-xs text-sky-950 border border-sky-200/70">
                                                            <strong className="text-sky-900 font-bold block mb-0.5">
                                                                Orientación para la verificación:
                                                            </strong>
                                                            {item.orientacion}
                                                        </div>
                                                    )}

                                                    <CajaNotasSubsanacion
                                                        codigo={item.codigo}
                                                        uuid={autoevaluacion?.uuid}
                                                        notaInicial={item.notas}
                                                        placeholder="Escribe recordatorios para la verificación (ej. inspección pendiente con el especialista, fecha de visita)..."
                                                    />

                                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                                        {item.recursos_educativos && item.recursos_educativos.length > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirRecurso(item)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-sky-700 transition-colors cursor-pointer"
                                                            >
                                                                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                                                                <span>Material técnico ({item.recursos_educativos.length})</span>
                                                            </button>
                                                        ) : (
                                                            <span />
                                                        )}

                                                        {botonVerSolucion(
                                                            item.asistencia_tecnica,
                                                            item.codigo,
                                                            item.titulo,
                                                            item.que_observar
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* BLOQUE 3: PUNTOS FUERTES DEL ESTABLECIMIENTO (Tarjeta Verde) */}
                            <section
                                aria-labelledby="cumple-title"
                                className="rounded-3xl border border-emerald-200 bg-emerald-50/20 p-5 sm:p-6 shadow-xs space-y-4 print:border-slate-300 print:bg-white print:p-4"
                            >
                                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                        </div>
                                        <div>
                                            <h2 id="cumple-title" className="text-base font-bold text-slate-900">
                                                Puntos Fuertes del Establecimiento
                                            </h2>
                                            <p className="text-xs text-slate-600">
                                                Condiciones de seguridad que tu local ya cumple satisfactoriamente.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarPuntosFuertes(!mostrarPuntosFuertes)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition cursor-pointer print:hidden"
                                    >
                                        <span>{resumen?.total_cumple_declarado ?? 0} conformes</span>
                                        {mostrarPuntosFuertes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>

                                {mostrarPuntosFuertes && (
                                    <>
                                        {cumple_declarado.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic p-2">
                                                No se registraron declaraciones cumplidas aún.
                                            </p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {cumple_declarado.map((item) => (
                                                    <div
                                                        key={item.codigo}
                                                        className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white shadow-2xs"
                                                    >
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                    {item.codigo}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                    Cumple declarado
                                                                </span>
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-semibold text-slate-800">
                                                                {item.titulo}
                                                            </p>
                                                        </div>
                                                        {item.norma_base && (
                                                            <span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline-block">
                                                                {item.norma_base}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>
                        </div>

                        {/* COLUMNA DERECHA (40% - Lateral): TRÁMITE, ESPECIALIDADES Y DESGLOSE */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* 1. TARJETA MODALIDAD DE TRÁMITE MUNICIPAL */}
                            {modalidadTramite && (
                                <section
                                    aria-labelledby="modalidad-tramite-title"
                                    className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 print:border-slate-300 print:shadow-none print:p-4"
                                >
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${modalidadTramite.contenido.iconoClases}`}>
                                            <modalidadTramite.contenido.icono className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 id="modalidad-tramite-title" className="text-xs font-black uppercase tracking-wider text-slate-500">
                                                Modalidad de Trámite Municipal
                                            </h2>
                                            <p className="text-sm font-bold text-slate-900">
                                                {modalidadTramite.contenido.titulo}
                                            </p>
                                        </div>
                                    </div>

                                    <p className="text-xs leading-relaxed text-slate-700">
                                        {modalidadTramite.contenido.mensaje}
                                    </p>

                                    <div className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <Clock className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                Plazo legal de subsanación
                                            </p>
                                            <p className="text-xs font-bold text-slate-800">
                                                {modalidadTramite.contenido.plazo}
                                            </p>
                                            {'detallePlazo' in modalidadTramite.contenido && (
                                                <p className="text-[11px] text-slate-600 leading-snug">
                                                    {(modalidadTramite.contenido as { detallePlazo?: string }).detallePlazo}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {'reprogramacion' in modalidadTramite.contenido && (
                                        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                                                    Regla de diligencia y reprogramación
                                                </p>
                                                <p className="text-[11px] text-amber-900 leading-snug">
                                                    {(modalidadTramite.contenido as { reprogramacion?: string }).reprogramacion}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* BOTONERA DE FORMATOS OFICIALES PARA MESA DE PARTES */}
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                        <div className="space-y-0.5">
                                            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-slate-600" />
                                                Formatos Oficiales (D.S. N° 002-2018-PCM)
                                            </h3>
                                            <p className="text-[11px] text-slate-500 leading-tight">
                                                Documentos canónicos para mesa de partes de la Municipalidad Provincial de Huancayo.
                                            </p>
                                        </div>

                                        {!esModalidadExAnte ? (
                                            /* MODALIDAD EX-POST: ANEXO 4 ES EL PRINCIPAL */
                                            <div className="space-y-2 pt-1">
                                                <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 space-y-2">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                                            Requisito Principal Mesa de Partes
                                                        </span>
                                                        <span className="text-[10px] font-mono text-emerald-700 font-bold">D.S. 002-2018-PCM</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-emerald-950">Declaración Jurada ITSE (Anexo 4)</h4>
                                                        <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                                                            Formato oficial con valor legal para tramitar Licencia de Funcionamiento con inspección técnica posterior.
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={route('autoevaluacion.anexo', { uuid: autoevaluacion.uuid, numero: 4 })}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition w-full"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>Descargar / Imprimir Declaración Jurada (Anexo 4)</span>
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalHojaModeloAbierto(true)}
                                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400 bg-white px-3.5 py-2 text-xs font-bold text-emerald-950 shadow-2xs hover:bg-emerald-50 transition w-full cursor-pointer"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>Guía Visual de Llenado (Hoja Modelo Anexo 4)</span>
                                                    </button>
                                                </div>

                                                <a
                                                    href={route('autoevaluacion.anexo', { uuid: autoevaluacion.uuid, numero: 9 })}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition w-full"
                                                >
                                                    <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Ver Solicitud de ITSE (Anexo 9 — Opcional)</span>
                                                </a>
                                            </div>
                                        ) : (
                                            /* MODALIDAD EX-ANTE: BLOQUEO DE ANEXO 4 + SOLICITUD ANEXO 9 + CHECKLIST EXPEDIENTE TÉCNICO */
                                            <div className="space-y-3 pt-1">
                                                {/* Alerta de bloqueo normativo de Anexo 4 */}
                                                <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                                                        <span>No aplica Declaración Jurada (Anexo 4)</span>
                                                    </div>
                                                    <p className="text-[11px] text-amber-900 leading-snug">
                                                        Por normativa peruana (D.S. N° 002-2018-PCM), los locales de <strong>Riesgo Alto o Muy Alto</strong> no pueden presentar Anexo 4. Requieren inspección técnica multidisciplinaria previa antes de la emisión de la Licencia.
                                                    </p>
                                                </div>

                                                {/* Botón destacado Solicitud de ITSE Previa (Anexo 9) */}
                                                <div className="rounded-xl border border-sky-300 bg-sky-50/90 p-3 space-y-2">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-200/70 px-2 py-0.5 rounded-full">
                                                            <FileCheck className="w-3 h-3 text-sky-700" />
                                                            Requisito Principal Mesa de Partes
                                                        </span>
                                                        <span className="text-[10px] font-mono text-sky-700 font-bold">ITSE Previa</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-sky-950">Solicitud de ITSE Previa (Anexo 9)</h4>
                                                        <p className="text-[11px] text-sky-800 leading-tight mt-0.5">
                                                            Formato oficial para programación de inspección técnica multidisciplinaria in situ.
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={route('autoevaluacion.anexo', { uuid: autoevaluacion.uuid, numero: 9 })}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-sky-700 transition w-full"
                                                    >
                                                        <ClipboardList className="w-3.5 h-3.5" />
                                                        <span>Descargar Solicitud de ITSE Previa (Anexo 9)</span>
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalHojaModeloAbierto(true)}
                                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-400 bg-white px-3.5 py-2 text-xs font-bold text-sky-950 shadow-2xs hover:bg-sky-50 transition w-full cursor-pointer"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                                                        <span>Guía Visual de Llenado (Hoja Modelo Anexo 1 / 9)</span>
                                                    </button>
                                                </div>

                                                {/* Tarjeta de Checklist de Requisitos del Expediente Técnico */}
                                                <div className="rounded-xl border border-slate-300 bg-white p-3.5 space-y-2.5 shadow-2xs">
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                            <Files className="w-3.5 h-3.5 text-slate-600" />
                                                            Expediente Técnico Requerido (ITSE Previa)
                                                        </h4>
                                                        <span className="text-[10px] font-mono text-slate-500 font-bold">D.S. 002-2018-PCM</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 leading-tight">
                                                        Para admitir a trámite su solicitud de ITSE Previa en Mesa de Partes (Huancayo), debe adjuntar la documentación técnica firmada por profesionales colegiados:
                                                    </p>
                                                    <ul className="space-y-2 text-xs text-slate-700">
                                                        <li className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-600 font-bold">1</span>
                                                            <span className="leading-snug">
                                                                <strong>Planos de arquitectura (Escala 1/100 o 1/50):</strong> Distribución arquitectónica y memoria descriptiva con cálculo reglamentario de aforo, suscritos por <strong>Arquitecto colegiado y habilitado (CAP)</strong>.
                                                            </span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-600 font-bold">2</span>
                                                            <span className="leading-snug">
                                                                <strong>Planos y diagramas unifilares:</strong> Planos de instalaciones eléctricas, tableros y cuadro de cargas suscritos por <strong>Ingeniero Electricista o Mecánico-Electricista colegiado y habilitado (CIP)</strong>.
                                                            </span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-600 font-bold">3</span>
                                                            <span className="leading-snug">
                                                                <strong>Protocolo de puesta a tierra (≤ 25 Ω):</strong> Certificado de medición vigente firmado por <strong>Ingeniero Electricista/Mecánico-Electricista colegiado (CIP)</strong> con constancia de calibración del telurómetro.
                                                            </span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-600 font-bold">4</span>
                                                            <span className="leading-snug">
                                                                <strong>Plan de Seguridad en Defensa Civil:</strong> Foliado y firmado en todas sus páginas por el administrado y profesional competente, incluyendo planos de señalización y evacuación.
                                                            </span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-[10px] text-slate-600 font-bold">5</span>
                                                            <span className="leading-snug">
                                                                <strong>Certificados de operatividad y específicos:</strong> Constancias vigentes de extintores (PQS / Clase K si tiene cocina) y pruebas de hermeticidad de GLP si aplica a su giro.
                                                            </span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        <Link
                                            href={route('autoevaluacion.informe', { uuid: autoevaluacion.uuid })}
                                            className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-slate-800 transition w-full"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            <span>Informe Preventivo Imprimible</span>
                                        </Link>
                                    </div>
                                </section>
                            )}

                            {/* 2. TARJETA DESGLOSE POR ESPECIALIDAD TÉCNICA */}
                            {desglose_especialidades && (
                                <section
                                    aria-labelledby="especialidades-title"
                                    className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3.5 print:border-slate-300 print:shadow-none print:p-4"
                                >
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                            <Layers className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <h2 id="especialidades-title" className="text-base font-bold text-slate-900">
                                                Desglose por Especialidad
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                Condiciones evaluadas por disciplina técnica ITSE.
                                            </p>
                                        </div>
                                    </div>

                                    <DesgloseEspecialidades
                                        desglose={desglose_especialidades}
                                        variante="detallada"
                                    />
                                </section>
                            )}

                            {/* 3. SIMULACIÓN ORIENTATIVA DE DILIGENCIA */}
                            <section
                                aria-label="Pronóstico de diligencia municipal"
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 print:hidden"
                            >
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                                    <Scale className="w-4 h-4 text-slate-600" />
                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                        Pronóstico Orientativo de Diligencia
                                    </h3>
                                </div>

                                {esApto ? (
                                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-3 text-xs text-emerald-950 space-y-1">
                                        <strong className="font-bold block text-emerald-900">
                                            Pronóstico Favorable:
                                        </strong>
                                        Acredita condiciones para la emisión formal del Certificado ITSE con vigencia de 2 años (D.S. N° 002-2018-PCM).
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-950 space-y-1">
                                        <strong className="font-bold block text-amber-900">
                                            Diligencia con Suspensión por Acta:
                                        </strong>
                                        Al presentarse observaciones, los inspectores levantarán un Acta de Diligencia otorgando plazo de subsanación de hasta {clasificacion_tramite?.tipo_tramite === 'EX_POST' ? '3 días' : '20 días'} hábiles.
                                    </div>
                                )}

                                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-[11px] text-rose-900 leading-snug">
                                    <strong className="font-bold block text-rose-950 mb-0.5">
                                        Advertencia de Denegatoria Inmediata:
                                    </strong>
                                    Incongruencia física grave de giro/riesgo o local no habilitado para operar causan denegatoria inmediata sin plazo (numeral 1.2.9 Manual CENEPRED).
                                </div>
                            </section>

                            {/* 4. CARACTERÍSTICAS FÍSICAS DECLARADAS (Acordeón colapsable) */}
                            {caracteristicasDeclaradas.length > 0 && (
                                <section aria-label="Ficha de características declaradas" className="print:hidden">
                                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                                        <button
                                            type="button"
                                            onClick={() => setMostrarFichaDeclarada(!mostrarFichaDeclarada)}
                                            aria-expanded={mostrarFichaDeclarada}
                                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-slate-50 transition"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ClipboardList className="h-4 w-4 text-slate-500" />
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-900">
                                                        Características Físicas Declaradas ({caracteristicasDeclaradas.length})
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500">
                                                        Parámetros base usados para filtrar las condiciones aplicables.
                                                    </p>
                                                </div>
                                            </div>
                                            {mostrarFichaDeclarada ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                        </button>

                                        {mostrarFichaDeclarada && (
                                            <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/50">
                                                <dl className="grid grid-cols-1 gap-2 text-xs">
                                                    {caracteristicasDeclaradas.map((caract) => (
                                                        <div key={caract.clave} className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                                                            <dt className="text-slate-600">{caract.etiqueta}</dt>
                                                            <dd className="font-bold text-slate-900">{caract.texto}</dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* 5. CONDICIONES NO APLICABLES (Acordeón colapsable sutil) */}
                            {no_aplica.length > 0 && (
                                <section aria-label="Condiciones no aplicables" className="print:hidden">
                                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
                                        <button
                                            type="button"
                                            onClick={() => setMostrarNoAplica(!mostrarNoAplica)}
                                            aria-expanded={mostrarNoAplica}
                                            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-slate-50 transition"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ShieldAlert className="h-4 w-4 text-slate-400" />
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-700">
                                                        Condiciones No Aplicables ({no_aplica.length})
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400">
                                                        Descartadas automáticamente por reglas del sistema.
                                                    </p>
                                                </div>
                                            </div>
                                            {mostrarNoAplica ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                        </button>

                                        {mostrarNoAplica && (
                                            <div className="border-t border-slate-100 p-4 space-y-2.5 bg-slate-50/50">
                                                {no_aplica.map((item) => (
                                                    <div key={item.codigo} className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono text-[11px] font-bold text-slate-800">{item.codigo}</span>
                                                            <span className="text-[10px] text-slate-400">Excluido por motor</span>
                                                        </div>
                                                        <p className="font-semibold text-slate-800">{item.titulo}</p>
                                                        <p className="text-[11px] text-slate-500 italic">Razón: {item.motivo}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* D. SELLO DE VALIDEZ CÍVICA Y CIERRE EJECUTIVO (Pie de Página)             */}
                    {/* ========================================================================= */}
                    <footer
                        aria-label="Sello de validez cívica y acciones finales"
                        className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 sm:p-8 shadow-xl print:hidden"
                    >
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                                <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/80 text-center shrink-0 w-28 sm:w-32 shadow-inner">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1.5">
                                        <ShieldCheck className="w-6 h-6 stroke-[2]" />
                                    </div>
                                    <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        CÓDIGO OFICIAL
                                    </span>
                                    <span className="mt-0.5 font-mono text-xs font-black tracking-wider text-emerald-400">
                                        {autoevaluacion.codigo_acceso || 'CHK-ITSE'}
                                    </span>
                                </div>

                                <div className="space-y-1.5 max-w-xl">
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-full uppercase">
                                            <ShieldCheck className="w-3 h-3" />
                                            {esRegistrada ? 'REGISTRO DE AUTOEVALUACIÓN FINALIZADO' : 'BORRADOR PREVENTIVO'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {esRegistrada ? 'VERSIÓN SELLADA' : 'FASE PREVIA'}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-white tracking-tight">
                                        Diagnóstico Técnico Orientativo — CheckITSE Huancayo
                                    </h3>
                                    <p className="text-xs leading-relaxed text-slate-400">
                                        Registro de Autoevaluación Finalizado — Carácter Orientativo y No Vinculante (D.S. N° 002-2018-PCM / R.J. N° 016-2018-CENEPRED/J). No constituye certificado ITSE ni exime de la inspección in situ de la Municipalidad Provincial de Huancayo.
                                    </p>
                                </div>
                            </div>

                            {/* Acciones principales de cierre */}
                            <div className="flex flex-col gap-2.5 w-full lg:w-auto shrink-0">
                                {!esRegistrada ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            triggerRef.current = e.currentTarget;
                                            setErrorFinalizar(null);
                                            setMostrarModalConfirmacion(true);
                                        }}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition cursor-pointer"
                                    >
                                        <Lock className="w-4 h-4" />
                                        <span>Confirmar y Registrar Autoevaluación</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-6 py-3 text-sm font-bold text-slate-950 shadow-md transition cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Imprimir Diagnóstico / Guardar PDF</span>
                                    </button>
                                )}

                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <Link
                                        href={route('autoevaluacion.checklist', { uuid: autoevaluacion.uuid })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{esRegistrada ? 'Ver en checklist' : 'Editar checklist'}</span>
                                    </Link>

                                    {auth?.user && (
                                        <Link
                                            href={route('mis-autoevaluaciones')}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                        >
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Mis Autoevaluaciones</span>
                                        </Link>
                                    )}

                                    {esRegistrada && (
                                        <Link
                                            href={route('autoevaluacion.reevaluar', { uuid: autoevaluacion.uuid })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-700/80 bg-emerald-950 text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Reevaluar local</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Trazabilidad y Huella de Registro (si está registrada) */}
                        {esRegistrada && autoevaluacion.hash_integridad && (
                            <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                                <div className="space-y-0.5">
                                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest block">
                                        TRAZABILIDAD Y HUELLA DE REGISTRO
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400">
                                        Snapshot ID: <strong className="text-slate-300 font-semibold">{autoevaluacion.hash_integridad.substring(0, 12)}</strong>
                                        {autoevaluacion.registrada_at && (
                                            <> • Sellado: {new Date(autoevaluacion.registrada_at).toLocaleString('es-PE')}</>
                                        )}
                                    </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-md self-start sm:self-center">
                                    Registro Inmutable
                                </span>
                            </div>
                        )}
                    </footer>
                </div>
            </div>

            {/* Modal de Confirmación de Registro Formal */}
            {mostrarModalConfirmacion && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs transition-opacity print:hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-confirmar-titulo"
                >
                    <div ref={modalRef} className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 id="modal-confirmar-titulo" className="text-lg font-bold text-slate-900">
                                        Confirmar y Registrar Autoevaluación
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Cierre formal e inmutable del diagnóstico técnico.
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
                                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                                aria-label="Cerrar modal"
                                disabled={finalizando}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-950">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>Atención: Acción Definitiva e Inmutable</span>
                            </div>
                            <p className="leading-relaxed">
                                Al registrar la autoevaluación, las declaraciones quedarán guardadas como una versión sellada y ya no podrán modificarse. Si posteriormente deseas realizar cambios, podrás iniciar una reevaluación conservando este registro histórico.
                            </p>
                        </div>

                        {errorFinalizar && (
                            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                    <p className="font-semibold">{errorFinalizar}</p>
                                </div>

                                {pendientesFinalizar.length > 0 && (
                                    <ul className="space-y-1 rounded-xl bg-white/80 p-2.5 border border-rose-100 max-h-36 overflow-y-auto">
                                        {pendientesFinalizar.map((pendiente) => (
                                            <li key={pendiente.codigo} className="flex flex-col gap-0.5">
                                                <span className="font-mono text-[11px] font-bold text-rose-900">
                                                    {pendiente.codigo}
                                                </span>
                                                <span className="text-rose-800">{pendiente.titulo}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <Link
                                    href={route('autoevaluacion.checklist', { uuid: autoevaluacion.uuid })}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-50 transition"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Volver al checklist para responder</span>
                                </Link>
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
                                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalizar}
                                disabled={finalizando}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
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

            {/* Modales Auxiliares */}
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

            <NubeAsistenciaModal
                isOpen={criterioSeleccionadoParaAsistencia !== null}
                onClose={() => setCriterioSeleccionadoParaAsistencia(null)}
                criterio={criterioSeleccionadoParaAsistencia}
            />

            <HojaModeloAnexo
                isOpen={modalHojaModeloAbierto}
                onClose={() => setModalHojaModeloAbierto(false)}
                autoevaluacion={autoevaluacion}
                clasificacion={clasificacion_tramite}
                resumen={resumen}
                condicionesConformes={cumple_declarado.map((c) => ({
                    codigo: c.codigo,
                    nombre: c.titulo,
                    norma: c.norma_base ?? undefined,
                }))}
            />
        </>
    );
}
