<?php

namespace App\Services\AI;

use App\Models\ResultadoAnalisisEvidencia;
use InvalidArgumentException;

class ValidacionResultadoIAService
{
    /**
     * Campos requeridos en la estructura raíz devuelta por el modelo.
     */
    protected const CAMPOS_REQUERIDOS = [
        'criterion_code',
        'image_quality',
        'evidence_relevance',
        'detected_elements',
        'visual_observations',
        'visible_conditions',
        'not_observable',
        'uncertainty_level',
        'photo_improvement_recommendations',
        'pedagogical_summary',
    ];

    /**
     * Expresiones no permitidas que serán saneadas si aparecen en las observaciones.
     */
    protected const FRASES_A_SANEAR = [
        'cumple con la norma' => 'presenta condiciones visuales coincidentes',
        'cumple la norma' => 'presenta condiciones coincidentes',
        'está aprobado' => 'se observa en aparente orden',
        'esta aprobado' => 'se observa en aparente orden',
        'conforme para inspección' => 'visualmente observable',
        'conforme para inspeccion' => 'visualmente observable',
        'inmune a clausura' => 'en evaluación preventiva',
        'garantizado' => 'registrado preventivamente',
        'certificado' => 'declarado',
    ];

    /**
     * Valida la estructura y sanea semánticamente la respuesta del modelo de IA.
     *
     * @param  array<string, mixed>  $rawResponse
     * @return array<string, mixed>
     *
     * @throws InvalidArgumentException
     */
    public function validarYSanear(array $rawResponse): array
    {
        foreach (self::CAMPOS_REQUERIDOS as $campo) {
            if (! array_key_exists($campo, $rawResponse)) {
                throw new InvalidArgumentException("La respuesta del modelo carece del campo obligatorio: '{$campo}'");
            }
        }

        $calidad = (string) $rawResponse['image_quality'];
        if (! in_array($calidad, ResultadoAnalisisEvidencia::CALIDADES_VALIDAS, true)) {
            $calidad = ResultadoAnalisisEvidencia::CALIDAD_ACEPTABLE;
        }

        $relevancia = (string) $rawResponse['evidence_relevance'];
        if (! in_array($relevancia, ResultadoAnalisisEvidencia::RELEVANCIAS_VALIDAS, true)) {
            $relevancia = ResultadoAnalisisEvidencia::RELEVANCIA_PARCIAL;
        }

        $incertidumbre = (string) $rawResponse['uncertainty_level'];
        if (! in_array($incertidumbre, ResultadoAnalisisEvidencia::INCERTIDUMBRES_VALIDAS, true)) {
            $incertidumbre = ResultadoAnalisisEvidencia::INCERTIDUMBRE_MEDIO;
        }

        // Sanitización y normalización de elementos detectados
        $elementosValidados = [];
        if (is_array($rawResponse['detected_elements'])) {
            foreach ($rawResponse['detected_elements'] as $elem) {
                if (! is_array($elem)) {
                    continue;
                }

                $nombre = (string) ($elem['element_name'] ?? 'Elemento sin nombre');
                $status = (string) ($elem['visual_status'] ?? ResultadoAnalisisEvidencia::VISUAL_NO_OBSERVABLE);
                if (! in_array($status, ResultadoAnalisisEvidencia::VISUALES_VALIDOS, true)) {
                    $status = ResultadoAnalisisEvidencia::VISUAL_NO_OBSERVABLE;
                }

                $confianza = strtoupper((string) ($elem['confidence_level'] ?? 'MEDIO'));
                if (! in_array($confianza, ['ALTO', 'MEDIO', 'BAJO'], true)) {
                    $confianza = 'MEDIO';
                }

                $descripcion = (string) ($elem['description'] ?? '');
                $descripcion = $this->sanearTexto($descripcion);

                $elementosValidados[] = [
                    'element_name' => $this->sanearTexto($nombre),
                    'visual_status' => $status,
                    'confidence_level' => $confianza,
                    'description' => $descripcion,
                ];
            }
        }

        return [
            'criterion_code' => (string) $rawResponse['criterion_code'],
            'image_quality' => $calidad,
            'evidence_relevance' => $relevancia,
            'uncertainty_level' => $incertidumbre,
            'detected_elements' => $elementosValidados,
            'visual_observations' => $this->sanearArrayTextos((array) $rawResponse['visual_observations']),
            'visible_conditions' => $this->sanearArrayTextos((array) $rawResponse['visible_conditions']),
            'not_observable' => $this->sanearArrayTextos((array) $rawResponse['not_observable']),
            'photo_improvement_recommendations' => $this->sanearArrayTextos((array) $rawResponse['photo_improvement_recommendations']),
            'pedagogical_summary' => $this->sanearTexto((string) $rawResponse['pedagogical_summary']),
        ];
    }

    /**
     * Sanea un arreglo de cadenas de texto.
     *
     * @param  array<int, mixed>  $textos
     * @return array<int, string>
     */
    protected function sanearArrayTextos(array $textos): array
    {
        $limpios = [];
        foreach ($textos as $t) {
            if (is_string($t) && filled(trim($t))) {
                $limpios[] = $this->sanearTexto(trim($t));
            }
        }

        return $limpios;
    }

    /**
     * Sanea términos categóricos o vinculantes reemplazándolos por vocabulario preventivo.
     */
    protected function sanearTexto(string $texto): string
    {
        $limpio = $texto;
        foreach (self::FRASES_A_SANEAR as $prohibido => $reemplazo) {
            $limpio = preg_replace('/\b'.preg_quote($prohibido, '/').'\b/iu', $reemplazo, $limpio) ?? $limpio;
        }

        return $limpio;
    }
}
