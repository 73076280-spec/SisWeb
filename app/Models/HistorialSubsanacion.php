<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialSubsanacion extends Model
{
    protected $table = 'historial_subsanaciones';

    protected $fillable = [
        'subsanacion_id',
        'estado_anterior',
        'estado_nuevo',
        'evidencia_url',
        'comentario',
    ];

    public function subsanacion(): BelongsTo
    {
        return $this->belongsTo(Subsanacion::class, 'subsanacion_id');
    }
}
