<?php

use App\Models\Autoevaluacion;
use App\Models\HistorialSubsanacion;
use App\Models\Subsanacion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\assertDatabaseCount;
use function Pest\Laravel\post;

function payloadBaseEvidencias(array $overrides = []): array
{
    return array_merge([
        'nombre_comercio' => 'Comercio Andino Jewel',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'sector' => 'Huancayo Centro',
        'area_m2' => '120.5',
        'pisos' => 1,
        'aforo' => 25,
        'usa_glp' => false,
        'galones_glp' => 0,
        'usa_caldero' => false,
        'usa_liquidos_inflamables' => false,
        'checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ], $overrides);
}

function crearAutoevaluacionEvidencias(array $overrides = []): Autoevaluacion
{
    post(route('autoevaluacion.store'), payloadBaseEvidencias($overrides))
        ->assertSessionHasNoErrors();

    return Autoevaluacion::firstOrFail();
}

function verificacionesEvidencias(): array
{
    return [
        'EXTINTOR' => true,
        'TERMOMAGNETICO' => true,
        'EVACUACION' => true,
        'LUCES_EMERG' => false,
        'BOTIQUIN' => true,
    ];
}

function registrarSimulacionEvidencias(Autoevaluacion $evaluacion, array $verificaciones = []): void
{
    post(
        route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        ['verificaciones' => $verificaciones ?: verificacionesEvidencias(), 'discrepancias' => 1]
    )->assertSessionHasNoErrors();
}

it('persiste una evidencia de imagen válida en storage público y actualiza evidencia_url', function () {
    Storage::fake('public');

    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $response = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ]
    );

    $response->assertSessionHasNoErrors();

    $subsanacion = Subsanacion::where('codigo_item', 'LUCES_EMERG')->firstOrFail();

    expect($subsanacion->evidencia_url)->toStartWith('evidencias/subsanaciones/');

    Storage::disk('public')->assertExists($subsanacion->evidencia_url);
});

it('rechaza archivos de evidencia no permitidos sin persistir subsanación', function (UploadedFile $archivo) {
    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    $response = post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => $archivo,
        ]
    );

    $response->assertSessionHasErrors('evidencia');

    assertDatabaseCount('subsanaciones', 0);
})->with([
    'ejecutable' => fn (): UploadedFile => UploadedFile::fake()->create('instalador.exe', 10),
    'imagen mayor a 5 MB' => fn (): UploadedFile => UploadedFile::fake()->createWithContent(
        'evidencia-grande.png',
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            .str_repeat("\0", 6 * 1024 * 1024)
    ),
]);

it('registra la trazabilidad histórica al cambiar el estado de una subsanación', function () {
    $evaluacion = crearAutoevaluacionEvidencias();
    registrarSimulacionEvidencias($evaluacion);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Se programa la instalación de la lámpara autónoma.',
            'estado' => 'PENDIENTE',
        ]
    )->assertSessionHasNoErrors();

    expect(HistorialSubsanacion::query()->count())->toBe(0);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    $historial = HistorialSubsanacion::query()->latest()->first();

    expect($historial)->not->toBeNull()
        ->and($historial->estado_anterior)->toBe('PENDIENTE')
        ->and($historial->estado_nuevo)->toBe('SUBSANADO_DECLARADO');
});

it('pasa a semáforo VERDE cuando todas las observaciones están declaradas como subsanadas', function () {
    $evaluacion = crearAutoevaluacionEvidencias([
        'checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ],
    ]);

    registrarSimulacionEvidencias($evaluacion, [
        'EXTINTOR' => false,
        'TERMOMAGNETICO' => true,
        'EVACUACION' => true,
        'LUCES_EMERG' => false,
        'BOTIQUIN' => true,
    ]);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'EXTINTOR',
            'descripcion_subsanacion' => 'Recarga y mantenimiento del extintor PQS con tarjeta vigente.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('ROJO')
        ->and($evaluacion->fresh()->semaforo)->not->toBe('VERDE');

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('VERDE')
        ->and($evaluacion->fresh()->porcentaje_cumplimiento)->toBe(100.0)

        ->and($evaluacion->simulaciones()->first()->fresh()->metrica_gap)->toBe(0.0);
});
