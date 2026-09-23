import React from 'react';
import { MapPin, AlertTriangle } from 'lucide-react';

const SECTORES: Record<string, { suelo: string; acel: string; recomendacion: string }> = {
  'San Carlos (Huancayo Centro)': {
    suelo: 'Suelo Intermedio / Depósito Aluvial',
    acel: 'Moderada (0.30g)',
    recomendacion: 'Anclaje de estanterías superiores a 1.80m y uso de láminas de seguridad en mamparas de vidrio.'
  },
  'El Tambo (Zona Pio Pato)': {
    suelo: 'Suelo Flexible no consolidado',
    acel: 'Moderada-Alta (0.34g)',
    recomendacion: 'Fijación mecánica de tableros eléctricos y evitar tabiquería sin confinamiento.'
  },
  'Chilca (Azapampa)': {
    suelo: 'Suelo Cohesivo / Zona de Ladera',
    acel: 'Alta (0.38g)',
    recomendacion: 'Asegurar balones de gas contra volteo y revisar presencia de fisuras previas en muros.'
  },
  'Pilcomayo': {
    suelo: 'Depósito Granular Ribereño',
    acel: 'Alta por efecto de sitio',
    recomendacion: 'Mantener pasillos de evacuación libres de cargas pesadas suspendidas.'
  }
};

export const ZonificacionAlerta: React.FC<{ sector: string }> = ({ sector }) => {
  const info = SECTORES[sector] || SECTORES['San Carlos (Huancayo Centro)'];

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 my-5 animate-in fade-in text-left">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-900 shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Vulnerabilidad y Amenaza Sísmica
            </h5>
            <span className="text-[10px] bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
              Arriola, 2024
            </span>
          </div>
          <p className="text-xs text-amber-900 mt-1">
            <strong>Tipo de Suelo:</strong> {info.suelo} | <strong>Aceleración esperada:</strong> {info.acel}
          </p>
          <div className="mt-2 text-xs text-amber-950 flex items-start gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
            <span>{info.recomendacion}</span>
          </div>
        </div>
      </div>
    </div>
  );
};