<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subsanacion extends Model
{
    protected $table = 'subsanaciones';

    protected $fillable = [
        'simulacion_revision_id',
        'codigo_item',
        'descripcion',
        'evidencia_url',
        'estado',
        'observacion',
        'fecha_subsanacion',
        'notas_ciudadano',
    ];

    protected $casts = [
        'fecha_subsanacion' => 'datetime',
    ];

    public function revision(): BelongsTo
    {
        return $this->belongsTo(SimulacionRevision::class, 'simulacion_revision_id');
    }

    public function historial(): HasMany
    {
        return $this->hasMany(HistorialSubsanacion::class, 'subsanacion_id');
    }
}
