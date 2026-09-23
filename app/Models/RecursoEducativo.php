<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class RecursoEducativo extends Model
{
    protected $table = 'recursos_educativos';

    protected $fillable = [
        'codigo_normativo',
        'titulo',
        'descripcion_didactica',
        'tipo',
        'url',
        'base_legal',
        'evidencia_sugerida',
        'activo',
    ];

    public function scopeActivos(Builder $query): Builder
    {
        return $query->where('activo', true);
    }

    public static function obtenerPorCodigo(string $codigo): ?self
    {
        return static::query()->activos()->where('codigo_normativo', $codigo)->first();
    }
}
