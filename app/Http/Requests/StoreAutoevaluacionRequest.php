<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreAutoevaluacionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     * Sanitiza campos opcionales vacíos para que sean tratados como null y no generen datos inventados.
     */
    protected function prepareForValidation(): void
    {
        $evaluacionOrigenUuid = $this->evaluacion_origen_uuid ?? $this->route('uuid');

        $usaGlp = $this->has('usa_glp') && $this->usa_glp !== null && $this->usa_glp !== ''
            ? filter_var($this->usa_glp, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
            : null;

        // Evita combinaciones contradictorias: si no usa GLP o no respondió, galones_glp debe ser null.
        $galonesGlp = ($usaGlp === true && filled($this->galones_glp))
            ? (float) $this->galones_glp
            : null;

        $tieneEquiposFritura = $this->has('tiene_equipos_fritura')
            ? $this->normalizarBooleanoOpcional($this->tiene_equipos_fritura)
            : null;

        $tieneEscaleras = $this->has('tiene_escaleras')
            ? $this->normalizarBooleanoOpcional($this->tiene_escaleras)
            : null;

        $tieneEstanteriasAltas = $this->has('tiene_estanterias_altas')
            ? $this->normalizarBooleanoOpcional($this->tiene_estanterias_altas)
            : null;

        $this->merge([
            'evaluacion_origen_uuid' => $evaluacionOrigenUuid,
            'ruc' => filled($this->ruc) ? trim($this->ruc) : null,
            'direccion' => filled($this->direccion) ? trim($this->direccion) : null,
            'referencia' => filled($this->referencia) ? trim($this->referencia) : null,
            'area_m2' => filled($this->area_m2) ? $this->area_m2 : null,
            'pisos' => filled($this->pisos) ? $this->pisos : null,
            'aforo' => filled($this->aforo) ? $this->aforo : null,
            'usa_glp' => $usaGlp,
            'galones_glp' => $galonesGlp,
            'usa_caldero' => $this->has('usa_caldero') && $this->usa_caldero !== null && $this->usa_caldero !== '' ? filter_var($this->usa_caldero, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null,
            'usa_liquidos_inflamables' => $this->has('usa_liquidos_inflamables') && $this->usa_liquidos_inflamables !== null && $this->usa_liquidos_inflamables !== '' ? filter_var($this->usa_liquidos_inflamables, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) : null,
            'tiene_equipos_fritura' => $tieneEquiposFritura,
            'tiene_escaleras' => $tieneEscaleras,
            'tiene_estanterias_altas' => $tieneEstanteriasAltas,
        ]);
    }

    /**
     * Normaliza entradas booleanas opcionales sin convertir silenciosamente valores inválidos a null.
     *
     * - Si está ausente, es null o cadena vacía '', retorna null (información no declarada).
     * - Si es un booleano estricto o representación controlada (true, false, 'true', 'false', 1, 0, '1', '0'), retorna el booleano.
     * - Si es un valor arbitrario o inválido (ej. 'abc', 'foo', 'si'), retorna el valor original intacto
     *   para que la regla 'nullable|boolean' lo rechace en el validador con un error de validación.
     */
    private function normalizarBooleanoOpcional(mixed $valor): mixed
    {
        if ($valor === null || $valor === '') {
            return null;
        }

        if ($valor === true || $valor === false) {
            return $valor;
        }

        if ($valor === 'true' || $valor === '1' || $valor === 1) {
            return true;
        }

        if ($valor === 'false' || $valor === '0' || $valor === 0) {
            return false;
        }

        return $valor;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Paso 1: Datos del establecimiento
            'nombre_comercio' => 'required|string|max:255',
            'funcion_economica' => 'required|string|max:255',
            'ruc' => ['nullable', 'string', 'regex:/^(10|20)\d{9}$/'],
            'direccion' => 'nullable|string|max:255',
            'referencia' => 'nullable|string|max:255',
            'area_m2' => 'nullable|numeric|min:0.1|max:100000',
            'pisos' => 'nullable|integer|min:1|max:100',
            'aforo' => 'nullable|integer|min:1|max:50000',
            'usa_glp' => 'nullable|boolean',
            'galones_glp' => 'nullable|numeric|min:0',
            'usa_caldero' => 'nullable|boolean',
            'usa_liquidos_inflamables' => 'nullable|boolean',
            'tiene_equipos_fritura' => 'nullable|boolean',
            'tiene_escaleras' => 'nullable|boolean',
            'tiene_estanterias_altas' => 'nullable|boolean',
            'evaluacion_origen_uuid' => 'nullable|string|exists:autoevaluaciones,uuid_trazabilidad',

            // Checklist de autoevaluación (opcional en creación; desacoplado del flujo dinámico normativo)
            'checklist' => 'nullable|array|max:50',
            'checklist.*.codigo' => ['required_with:checklist', 'string', 'distinct:strict', 'max:100'],
            'checklist.*.estado' => ['required_with:checklist', 'string', 'in:CUMPLE,NO_CUMPLE,POR_REVISAR,NA,CUMPLE_DECLARADO,PENDIENTE_ATENDER,NO_APLICA'],
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nombre_comercio.required' => 'El nombre del establecimiento es obligatorio.',
            'funcion_economica.required' => 'Selecciona la actividad principal del establecimiento.',
            'ruc.regex' => 'El RUC debe tener 11 dígitos y comenzar con 10 o 20.',
            'area_m2.min' => 'El área debe ser mayor a 0 metros cuadrados.',
            'pisos.min' => 'El número de pisos debe ser al menos 1.',
            'aforo.min' => 'El aforo debe ser al menos 1 persona.',
            'checklist.required' => 'Falta completar la autoevaluación antes de finalizar.',
            'checklist.min' => 'Falta completar la autoevaluación antes de finalizar.',
            'checklist.max' => 'La autoevaluación contiene demasiadas condiciones.',
            'checklist.*.codigo.required' => 'Una de las condiciones no tiene un identificador válido.',
            'checklist.*.codigo.distinct' => 'La autoevaluación contiene condiciones duplicadas.',
            'checklist.*.estado.required' => 'Una de las condiciones no tiene respuesta registrada.',
            'checklist.*.estado.in' => 'Una de las condiciones tiene una respuesta no válida.',
            'tiene_equipos_fritura.boolean' => 'El valor indicado para equipos de fritura no es válido.',
            'tiene_escaleras.boolean' => 'El valor indicado para escaleras no es válido.',
            'tiene_estanterias_altas.boolean' => 'El valor indicado para estanterías altas no es válido.',
        ];
    }
}
