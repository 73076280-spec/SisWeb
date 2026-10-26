<?php

use App\Models\Autoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;
use function Pest\Laravel\withCookie;

/**
 * Helpers para instanciar autoevaluaciones bajo prueba
 */
function crearAutoevaluacionRegistradaConPropietario(User $user): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Bodega Propietario',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 70.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ]);
}

function crearAutoevaluacionRegistradaInvitado(string $sessionToken): Autoevaluacion
{
    return Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => null,
        'session_token' => $sessionToken,
        'nombre_comercio' => 'Bodega Invitado',
        'funcion_economica' => 'Comercio',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'AMBAR',
        'porcentaje_cumplimiento' => 70.0,
        'detalle_checklist' => [
            ['codigo' => 'EXTINTOR', 'cumple' => true, 'estado' => 'CUMPLE', 'es_critico' => false],
            ['codigo' => 'LUCES_EMERG', 'cumple' => false, 'estado' => 'NO_CUMPLE', 'es_critico' => false],
        ],
    ]);
}

function payloadSimulacion(): array
{
    return [
        'verificaciones' => ['EXTINTOR' => true, 'LUCES_EMERG' => false],
        'discrepancias' => 1,
    ];
}

/*
|--------------------------------------------------------------------------
| H-03: simulacionRevision (GET /autoevaluacion/revision/{uuid})
|--------------------------------------------------------------------------
*/
describe('H-03: simulacionRevision (GET /autoevaluacion/revision/{uuid})', function () {
    test('propietario autenticado accede con 200 OK', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($propietario);

        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();
    });

    test('otro usuario autenticado recibe 403 Forbidden', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($intruso);

        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('invitado sin cookie o con cookie ajena no accede y recibe 403 Forbidden', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $tokenAjeno = 'token_atacante_ajeno_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        // Sin cookie
        get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();

        // Con cookie ajena
        withCookie('guest_session_token', $tokenAjeno)
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertForbidden();
    });

    test('invitado titular con su cookie legítima accede con 200 OK', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        withCookie('guest_session_token', $tokenReal)
            ->get(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]))
            ->assertOk();
    });
});

/*
|--------------------------------------------------------------------------
| H-03: guardarSimulacion (POST /autoevaluacion/revision/{uuid})
|--------------------------------------------------------------------------
*/
describe('H-03: guardarSimulacion (POST /autoevaluacion/revision/{uuid})', function () {
    test('propietario autenticado guarda simulación y es redirigido', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($propietario);

        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    });

    test('otro usuario autenticado recibe 403 Forbidden al intentar guardar simulación', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        actingAs($intruso);

        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();
    });

    test('invitado sin cookie o con cookie ajena recibe 403 Forbidden', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $tokenAjeno = 'token_atacante_ajeno_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        // Sin cookie
        post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();

        // Con cookie ajena
        withCookie('guest_session_token', $tokenAjeno)
            ->post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertForbidden();
    });

    test('invitado titular con su cookie legítima guarda simulación y es redirigido', function () {
        $tokenReal = 'token_real_legitimo_12345678901234567890';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        withCookie('guest_session_token', $tokenReal)
            ->post(route('autoevaluacion.simulacion.store', ['uuid' => $autoevaluacion->uuid_trazabilidad]), payloadSimulacion())
            ->assertRedirect(route('autoevaluacion.simulacion', ['uuid' => $autoevaluacion->uuid_trazabilidad]));
    });
});

/*
|--------------------------------------------------------------------------
| H-03: descargarEvidencia (GET /autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion})
|--------------------------------------------------------------------------
*/
describe('H-03: descargarEvidencia', function () {
    test('propietario autenticado descarga evidencia y otro usuario recibe 403', function () {
        Storage::fake('local');
        $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('foto.jpg', 100));

        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $simulacion = SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'REV-001',
            'resultado' => 'CON_OBSERVACIONES',
            'detalle_revision' => ['LUCES_EMERG' => false],
            'porcentaje_revision' => 50.0,
            'metrica_gap' => 20.0,
            'total_observaciones' => 1,
        ]);

        $subsanacion = Subsanacion::create([
            'simulacion_revision_id' => $simulacion->id,
            'codigo_item' => 'LUCES_EMERG',
            'descripcion' => 'Se colocaron luces LED autónomas',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia_url' => $rutaArchivo,
        ]);

        $url = route('autoevaluacion.evidencia', [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'subsanacion' => $subsanacion->id,
        ]);

        // Intruso recibe 403
        actingAs($intruso)->get($url)->assertForbidden();

        // Propietario accede 200
        actingAs($propietario)->get($url)->assertOk();
    });

    test('invitado con cookie descarga evidencia y sin cookie o cookie ajena recibe 403', function () {
        Storage::fake('local');
        $rutaArchivo = Storage::disk('local')->putFile('evidencias/subsanaciones', UploadedFile::fake()->create('foto.jpg', 100));

        $tokenReal = 'token_invitado_descarga_1234567890';
        $tokenAjeno = 'token_invitado_descarga_9999999999';
        $autoevaluacion = crearAutoevaluacionRegistradaInvitado($tokenReal);

        $simulacion = SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'REV-002',
            'resultado' => 'CON_OBSERVACIONES',
            'detalle_revision' => ['LUCES_EMERG' => false],
            'porcentaje_revision' => 50.0,
            'metrica_gap' => 20.0,
            'total_observaciones' => 1,
        ]);

        $subsanacion = Subsanacion::create([
            'simulacion_revision_id' => $simulacion->id,
            'codigo_item' => 'LUCES_EMERG',
            'descripcion' => 'Se colocaron luces LED autónomas',
            'estado' => 'SUBSANADO_DECLARADO',
            'evidencia_url' => $rutaArchivo,
        ]);

        $url = route('autoevaluacion.evidencia', [
            'uuid' => $autoevaluacion->uuid_trazabilidad,
            'subsanacion' => $subsanacion->id,
        ]);

        // Sin cookie -> 403
        get($url)->assertForbidden();

        // Con cookie ajena -> 403
        withCookie('guest_session_token', $tokenAjeno)->get($url)->assertForbidden();

        // Con cookie legítima -> 200
        withCookie('guest_session_token', $tokenReal)->get($url)->assertOk();
    });
});

/*
|--------------------------------------------------------------------------
| H-03: mis-autoevaluaciones/{uuid}/expediente
|--------------------------------------------------------------------------
*/
describe('H-03: mis-autoevaluaciones/{uuid}/expediente', function () {
    test('propietario autenticado accede a expediente y otro usuario autenticado recibe 403', function () {
        $propietario = User::factory()->create();
        $intruso = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $url = route('mis-autoevaluaciones.expediente', ['uuid' => $autoevaluacion->uuid_trazabilidad]);

        // Intruso recibe 403
        actingAs($intruso)->get($url)->assertForbidden();

        // Propietario accede 200
        actingAs($propietario)->get($url)->assertOk();
    });

    test('visitante no autenticado es redirigido a login', function () {
        $propietario = User::factory()->create();
        $autoevaluacion = crearAutoevaluacionRegistradaConPropietario($propietario);

        $url = route('mis-autoevaluaciones.expediente', ['uuid' => $autoevaluacion->uuid_trazabilidad]);

        get($url)->assertRedirect(route('login'));
    });
});
