<?php

use App\Models\RecursoEducativo;
use App\Services\ItseRiskService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function payloadRecursoEducativo(array $overrides = []): array
{
    return array_merge([
        'codigo_normativo' => 'LUCES_EMERG',
        'titulo' => 'Luz de emergencia: botón de test y autonomía',
        'descripcion_didactica' => 'Cómo probar el botón de test y verificar la autonomía de la batería.',
        'tipo' => 'YOUTUBE',
        'url' => 'https://www.youtube.com/watch?v=_frRgvwU8mA',
        'base_legal' => 'CNE-U',
        'evidencia_sugerida' => 'Foto del botón de test activado.',
        'activo' => true,
    ], $overrides);
}

it('filtra solo los recursos educativos activos con scopeActivos', function () {
    RecursoEducativo::create(payloadRecursoEducativo());
    RecursoEducativo::create(payloadRecursoEducativo([
        'codigo_normativo' => 'EXTINTOR_PQS',
        'activo' => false,
    ]));

    $activos = RecursoEducativo::activos()->pluck('codigo_normativo');

    expect($activos)->toHaveCount(1)
        ->toContain('LUCES_EMERG')
        ->not->toContain('EXTINTOR_PQS');
});

it('enriquece el catalogo del checklist con los metadatos educativos del recurso activo', function () {
    RecursoEducativo::create(payloadRecursoEducativo());
    RecursoEducativo::create(payloadRecursoEducativo([
        'codigo_normativo' => 'EVACUACION',
        'activo' => false,
    ]));

    $catalogo = (new ItseRiskService)->getCatalogoChecklist();

    $item = collect($catalogo)->firstWhere('codigo', 'LUCES_EMERG');

    expect($item)->not->toBeNull()
        ->and($item['video_url'])->toBe('https://www.youtube.com/watch?v=_frRgvwU8mA')
        ->and($item['tipo'])->toBe('YOUTUBE')
        ->and($item['base_legal'])->toBe('CNE-U')
        ->and($item['evidencia_sugerida'])->toBe('Foto del botón de test activado.')
        ->and(collect($catalogo)->firstWhere('codigo', 'EVACUACION')['video_url'])->toBeNull();
});
