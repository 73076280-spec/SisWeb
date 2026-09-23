<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Autoevaluacion extends Model
{
    protected $table = 'autoevaluaciones';

    protected $fillable = [
        'user_id',
        'session_token',
        'uuid_trazabilidad',
        'hash_integridad',
        'nombre_comercio',
        'funcion_economica',
        'ruc',
        'sector_huancayo',
        'area_m2',
        'pisos',
        'aforo',
        'usa_glp',
        'galones_glp',
        'usa_caldero',
        'usa_liquidos_inflamables',
        'tipo_tramite',
        'nivel_riesgo',
        'porcentaje_cumplimiento',
        'semaforo',
        'detalle_checklist',
        'plan_accion_costos',
    ];

    protected $casts = [
        'area_m2' => 'float',
        'pisos' => 'integer',
        'aforo' => 'integer',
        'usa_glp' => 'boolean',
        'galones_glp' => 'float',
        'usa_caldero' => 'boolean',
        'usa_liquidos_inflamables' => 'boolean',
        'porcentaje_cumplimiento' => 'float',
        'detalle_checklist' => 'array',
        'plan_accion_costos' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function simulaciones(): HasMany
    {
        return $this->hasMany(SimulacionRevision::class, 'autoevaluacion_id');
    }

    /**
     * Última simulación de revisión in situ registrada para la autoevaluación.
     * Usada para consolidar el informe preventivo con su trazabilidad completa.
     */
    public function simulacionRevision(): HasOne
    {
        return $this->hasOne(SimulacionRevision::class, 'autoevaluacion_id')->latestOfMany();
    }
}
