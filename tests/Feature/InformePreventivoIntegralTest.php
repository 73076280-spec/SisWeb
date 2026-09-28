<?php

use App\Models\Autoevaluacion;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\get;
use function Pest\Laravel\post;

function payloadInformePreventivoIntegral(array $overrides = []): array
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

function crearAutoevaluacionInformePreventivo(array $overrides = []): Autoevaluacion
{
    post(route('autoevaluacion.store'), payloadInformePreventivoIntegral($overrides))
        ->assertSessionHasNoErrors();

    return Autoevaluacion::firstOrFail();
}

function verificacionesInformePreventivo(): array
{
    return [
        'EXTINTOR' => true,
        'TERMOMAGNETICO' => true,
        'EVACUACION' => true,
        'LUCES_EMERG' => false,
        'BOTIQUIN' => true,
    ];
}

function registrarSimulacionInformePreventivo(Autoevaluacion $evaluacion): void
{
    post(
        route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        ['verificaciones' => verificacionesInformePreventivo(), 'discrepancias' => 1]
    )->assertSessionHasNoErrors();
}

function subsanarInformePreventivo(
    Autoevaluacion $evaluacion,
    string $descripcion = 'Instalada lampara autonoma LED con bateria de 90 minutos.'
): void {
    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => $descripcion,
            'estado' => 'SUBSANADO_DECLARADO',
        ]
    )->assertSessionHasNoErrors();
}

test('el informe esta disponible y responde 200 aunque el semaforo no sea verde o queden deficiencias pendientes', function () {
    $evaluacion = crearAutoevaluacionInformePreventivo();

    registrarSimulacionInformePreventivo($evaluacion);

    expect($evaluacion->fresh()->semaforo)->toBe('AMBAR');

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.semaforo', 'AMBAR'));

    $evaluacion->fresh()->update(['semaforo' => 'ROJO']);

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.semaforo', 'ROJO'));
});

test('el informe con semaforo verde y subsanaciones completas retorna 200 y carga la vista Inertia', function () {
    Storage::fake('local');

    $evaluacion = crearAutoevaluacionInformePreventivo();
    registrarSimulacionInformePreventivo($evaluacion);

    post(
        route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
        [
            'codigo_item' => 'LUCES_EMERG',
            'descripcion_subsanacion' => 'Instalada lampara autonoma LED con bateria de 90 minutos.',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia' => UploadedFile::fake()->createWithContent(
                'evidencia.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ]
    )->assertSessionHasNoErrors();

    expect($evaluacion->fresh()->semaforo)->toBe('VERDE');

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('codigoInforme', fn (string $codigo) => str_starts_with($codigo, 'INF-PREV-'))
            ->where('autoevaluacion.nombre_comercio', 'Comercio Andino Jewel')
            ->where('autoevaluacion.ruc', '20123456789')
            ->where('resumen.total_condiciones', 5)
            ->where('resumen.conformes_iniciales', 4)
            ->where('resumen.subsanadas_declaradas', 1)
            ->where('resumen.gap_final', 0)
            ->where('resumen.porcentaje_subsanado', 100)
            ->has('matrizSubsanaciones', 1)
            ->where('matrizSubsanaciones.0.codigo_item', 'LUCES_EMERG')
            ->where('matrizSubsanaciones.0.estado', 'SUBSANADO_DECLARADO')
            ->where('matrizSubsanaciones.0.evidencia_url', fn (string $url) => str_contains($url, '/autoevaluacion/subsanacion/') && str_contains($url, '/evidencia/'))
            ->where('hashIntegridad', $evaluacion->hash_integridad)
            ->where('hashIntegridad', fn (string $hash) => strlen($hash) === 64)
            ->where('hashFinal', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1));
});

test('el informe consolida la estructura de hash SHA-256 y los datos del establecimiento', function () {
    $evaluacion = crearAutoevaluacionInformePreventivo();
    registrarSimulacionInformePreventivo($evaluacion);
    subsanarInformePreventivo($evaluacion);

    get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Evaluacion/InformePreventivo')
            ->where('autoevaluacion.uuid_trazabilidad', $evaluacion->uuid_trazabilidad)
            ->where('autoevaluacion.funcion_economica', 'Comercio')
            ->where('autoevaluacion.sector_huancayo', null)
            ->where('autoevaluacion.area_m2', 120.5)
            ->where('autoevaluacion.aforo', 25)
            ->where('autoevaluacion.pisos', 1)
            ->where('autoevaluacion.semaforo', 'VERDE')
            ->where('resumen.total_condiciones', 5)
            ->where('resumen.conformes_iniciales', 4)
            ->where('resumen.subsanadas_declaradas', 1)
            ->where('hashIntegridad', $evaluacion->hash_integridad)
            ->where('hashIntegridad', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1)
            ->where('hashFinal', fn (string $hash) => preg_match('/^[a-f0-9]{64}$/i', $hash) === 1)
            ->has('matrizSubsanaciones', 1)
            ->where('matrizSubsanaciones.0.codigo_item', 'LUCES_EMERG')
            ->where(
                'matrizSubsanaciones.0.deficiencia_inicial',
                'Luces de emergencia autónomas operativas en vías de salida (autonomía 90 min)'
            )
            ->where('matrizSubsanaciones.0.accion_realizada', 'Instalada lampara autonoma LED con bateria de 90 minutos.'));
});
