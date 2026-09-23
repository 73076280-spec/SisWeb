<?php

namespace Tests\Feature;

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class CheckItseModulosTest extends TestCase
{
    use RefreshDatabase;

    private function checklistConforme(): array
    {
        return [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ];
    }

    private function checklistMixto(): array
    {
        return [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'TERMOMAGNETICO', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'EVACUACION', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => true],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
            ['codigo' => 'BOTIQUIN', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
        ];
    }

    private function payloadBase(array $overrides = []): array
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
            'checklist' => $this->checklistMixto(),
        ], $overrides);
    }

    private function crearAutoevaluacion(array $overrides = []): Autoevaluacion
    {
        $this->post(route('autoevaluacion.store'), $this->payloadBase($overrides))
            ->assertSessionHasNoErrors();

        return Autoevaluacion::firstOrFail();
    }

    private function verificacionesMixtas(): array
    {
        return [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'LUCES_EMERG' => false,
            'BOTIQUIN' => true,
        ];
    }

    private function verificacionesConformes(): array
    {
        return [
            'EXTINTOR' => true,
            'TERMOMAGNETICO' => true,
            'EVACUACION' => true,
            'LUCES_EMERG' => true,
            'BOTIQUIN' => true,
        ];
    }

    private function registrarSimulacion(Autoevaluacion $evaluacion, array $verificaciones, int $discrepancias): void
    {
        $this->post(
            route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            ['verificaciones' => $verificaciones, 'discrepancias' => $discrepancias]
        )->assertSessionHasNoErrors();
    }

    // ---------------------------------------------------------------------
    // Autoevaluación
    // ---------------------------------------------------------------------

    public function test_get_autoevaluacion_retorna_200(): void
    {
        $this->get(route('autoevaluacion.index'))->assertOk();
    }

    public function test_post_autoevaluacion_valida_campos_requeridos(): void
    {
        $response = $this->post(route('autoevaluacion.store'), []);

        $response->assertSessionHasErrors([
            'nombre_comercio',
            'funcion_economica',
            'ruc',
            'sector',
            'area_m2',
            'pisos',
            'aforo',
            'checklist',
        ]);

        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_rechaza_ruc_invalido(): void
    {
        $rucsInvalidos = ['12345678901', '30123456789', '2012345678', '201234567890', '2012ABCD789'];

        foreach ($rucsInvalidos as $ruc) {
            $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['ruc' => $ruc]));

            $response->assertSessionHasErrors(['ruc']);
        }

        $this->assertDatabaseCount('autoevaluaciones', 0);
    }

    public function test_post_autoevaluacion_acepta_ruc_con_prefijo_10_y_20(): void
    {
        foreach (['10123456789', '20123456789'] as $indice => $ruc) {
            $response = $this->post(route('autoevaluacion.store'), $this->payloadBase(['ruc' => $ruc]));

            $response->assertSessionHasNoErrors();
            $this->assertDatabaseCount('autoevaluaciones', $indice + 1);
        }
    }

    public function test_post_autoevaluacion_crea_registro_uuid_hash_y_redireccion(): void
    {
        $response = $this->post(route('autoevaluacion.store'), $this->payloadBase());

        $response->assertSessionHasNoErrors();

        $this->assertDatabaseCount('autoevaluaciones', 1);
        $this->assertDatabaseHas('autoevaluaciones', [
            'ruc' => '20123456789',
            'tipo_tramite' => 'EX_POST',
            'nivel_riesgo' => 'BAJO_MEDIO',
            'semaforo' => 'AMBAR',
        ]);

        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertSame(36, strlen($evaluacion->uuid_trazabilidad));
        $this->assertSame(64, strlen($evaluacion->hash_integridad));
        $this->assertSame('EX_POST', $evaluacion->tipo_tramite);
        $this->assertSame('BAJO_MEDIO', $evaluacion->nivel_riesgo);
        $this->assertSame(80.0, $evaluacion->porcentaje_cumplimiento);
        $this->assertSame('AMBAR', $evaluacion->semaforo);

        $response->assertRedirect(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]));
    }

    public function test_post_autoevaluacion_clasifica_ex_ante_por_area_800(): void
    {
        $evaluacion = $this->crearAutoevaluacion(['area_m2' => '800.0']);

        $this->assertSame('EX_ANTE', $evaluacion->tipo_tramite);
        $this->assertSame('ALTO_MUY_ALTO', $evaluacion->nivel_riesgo);
        $this->assertDatabaseHas('autoevaluaciones', ['ruc' => '20123456789', 'tipo_tramite' => 'EX_ANTE']);
    }

    public function test_hash_integridad_es_sha256_consistente_64_hexadecimal(): void
    {
        $this->travelTo(Carbon::parse('2026-05-01 10:00:00'));
        $timestamp = Carbon::now()->timestamp;

        $this->post(route('autoevaluacion.store'), $this->payloadBase())->assertSessionHasNoErrors();

        $this->travelBack();

        $evaluacion = Autoevaluacion::firstOrFail();
        $this->assertSame(64, strlen($evaluacion->hash_integridad));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/i', $evaluacion->hash_integridad);
        $this->assertSame(
            hash('sha256', $evaluacion->uuid_trazabilidad.$evaluacion->ruc.$timestamp),
            $evaluacion->hash_integridad
        );
    }

    // ---------------------------------------------------------------------
    // Consulta de resultados
    // ---------------------------------------------------------------------

    public function test_resultado_con_uuid_existente_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.resultado', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_resultado_con_uuid_inexistente_retorna_404(): void
    {
        $this->get(route('autoevaluacion.resultado', ['uuid' => '00000000-0000-4000-8000-000000000000']))
            ->assertNotFound();
    }

    // ---------------------------------------------------------------------
    // Simulación de revisión in situ
    // ---------------------------------------------------------------------

    public function test_simulacion_revision_con_uuid_existente_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.simulacion', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_simulacion_revision_con_uuid_inexistente_retorna_404(): void
    {
        $this->get(route('autoevaluacion.simulacion', ['uuid' => '00000000-0000-4000-8000-000000000000']))
            ->assertNotFound();
    }

    public function test_guardar_simulacion_registra_codigo_preventivo_y_calcula_observaciones(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $response = $this->post(
            route('autoevaluacion.simulacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            ['verificaciones' => $this->verificacionesMixtas(), 'discrepancias' => 1]
        );

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $evaluacion->uuid_trazabilidad]));

        $this->assertDatabaseHas('simulaciones_revision', [
            'autoevaluacion_id' => $evaluacion->id,
            'total_observaciones' => 1,
            'resultado' => 'CON_OBSERVACIONES',
        ]);

        $simulacion = SimulacionRevision::where('autoevaluacion_id', $evaluacion->id)->firstOrFail();
        $this->assertSame(80.0, $simulacion->porcentaje_revision);
        $this->assertSame(0.0, $simulacion->metrica_gap);
        $this->assertStringStartsWith('PREV-ITSE-', $simulacion->codigo_revision);
    }

    public function test_guardar_simulacion_sin_observaciones_gap_negativo(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->registrarSimulacion($evaluacion, $this->verificacionesConformes(), 0);

        $simulacion = SimulacionRevision::where('autoevaluacion_id', $evaluacion->id)->firstOrFail();
        $this->assertSame(0, $simulacion->total_observaciones);
        $this->assertSame(100.0, $simulacion->porcentaje_revision);
        $this->assertSame(-20.0, $simulacion->metrica_gap);
        $this->assertSame('SIN_OBSERVACIONES', $simulacion->resultado);
    }

    // ---------------------------------------------------------------------
    // Subsanación preventiva
    // ---------------------------------------------------------------------

    public function test_panel_subsanacion_retorna_200(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $this->get(route('autoevaluacion.subsanacion', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }

    public function test_subsanacion_persiste_estado_en_proceso_sin_recalculo(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Instalada lámpara autónoma con batería de respaldo de 90 minutos.',
                'estado' => 'EN_PROCESO',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'LUCES_EMERG',
            'estado' => 'EN_PROCESO',
        ]);

        $this->assertSame('AMBAR', $evaluacion->fresh()->semaforo);
    }

    public function test_subsanacion_persiste_estado_pendiente(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'EXTINTOR',
                'descripcion_subsanacion' => 'Se programa recarga y mantenimiento del extintor PQS.',
                'estado' => 'PENDIENTE',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'EXTINTOR',
            'estado' => 'PENDIENTE',
        ]);
    }

    public function test_subsanacion_declarada_recalcula_semaforo_a_verde(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Instalada lámpara autónoma LED con batería de 90 minutos.',
                'estado' => 'SUBSANADO_DECLARADO',
            ]
        );

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('subsanaciones', [
            'codigo_item' => 'LUCES_EMERG',
            'estado' => 'SUBSANADO_DECLARADO',
        ]);

        $this->assertSame('VERDE', $evaluacion->fresh()->semaforo);
        $this->assertSame(100.0, $evaluacion->fresh()->porcentaje_cumplimiento);

        $simulacion = $evaluacion->simulaciones()->firstOrFail();
        $this->assertSame('SIN_OBSERVACIONES', $simulacion->fresh()->resultado);
        $this->assertSame(100.0, $simulacion->fresh()->porcentaje_revision);
        $this->assertSame(0.0, $simulacion->fresh()->metrica_gap);
    }

    public function test_subsanacion_rechaza_estado_fuera_del_plan(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
            route('autoevaluacion.subsanacion.store', ['uuid' => $evaluacion->uuid_trazabilidad]),
            [
                'codigo_item' => 'LUCES_EMERG',
                'descripcion_subsanacion' => 'Descripción de sustento técnico válida.',
                'estado' => 'ESTADO_NO_PERMITIDO',
            ]
        );

        $response->assertSessionHasErrors(['estado']);
        $this->assertDatabaseCount('subsanaciones', 0);
    }

    public function test_subsanacion_acepta_evidencia_de_imagen(): void
    {
        $evaluacion = $this->crearAutoevaluacion();
        $this->registrarSimulacion($evaluacion, $this->verificacionesMixtas(), 1);

        $response = $this->post(
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
        $this->assertStringStartsWith('evidencias/subsanaciones/', (string) $subsanacion->evidencia_url);
    }

    // ---------------------------------------------------------------------
    // Informe de autoevaluación preventiva
    // ---------------------------------------------------------------------

    public function test_informe_rechaza_semaforo_no_verde(): void
    {
        $evaluacion = $this->crearAutoevaluacion();

        $this->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))
            ->assertRedirect(route('autoevaluacion.subsanacion', ['uuid' => $evaluacion->uuid_trazabilidad]))
            ->assertSessionHasErrors('error');
    }

    public function test_informe_disponible_cuando_semaforo_es_verde(): void
    {
        $evaluacion = $this->crearAutoevaluacion(['checklist' => $this->checklistConforme()]);

        $this->assertSame('VERDE', $evaluacion->fresh()->semaforo);

        $this->get(route('autoevaluacion.informe', ['uuid' => $evaluacion->uuid_trazabilidad]))->assertOk();
    }
}
