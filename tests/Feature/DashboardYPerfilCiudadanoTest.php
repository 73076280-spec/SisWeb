<?php

use App\Models\Autoevaluacion;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\put;

test('Visitante no autenticado es redirigido a login al intentar acceder al panel ciudadano', function () {
    get(route('dashboard'))
        ->assertRedirect(route('login'));
});

test('Usuario autenticado accede al panel ciudadano con sus locales y KPIs', function () {
    $user = User::factory()->create();

    Autoevaluacion::create([
        'uuid_trazabilidad' => (string) Str::uuid(),
        'user_id' => $user->id,
        'nombre_comercio' => 'Boutique Andina',
        'funcion_economica' => 'Comercio',
        'ruc' => '20123456789',
        'estado' => Autoevaluacion::ESTADO_REGISTRADA,
        'semaforo' => 'VERDE',
        'porcentaje_cumplimiento' => 100.0,
        'detalle_checklist' => [],
    ]);

    actingAs($user);

    get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard/Dashboard')
            ->has('records', 1)
            ->where('records.0.nombre_comercio', 'Boutique Andina')
            ->where('kpis.total_locales', 1)
            ->where('kpis.aprobados', 1)
            ->where('kpis.observados', 0)
            ->where('kpis.en_proceso', 0)
            ->where('kpis.riesgo_dominante', fn ($val) => is_string($val))
        );
});

test('Visitante no autenticado es redirigido a login al consultar el perfil', function () {
    get(route('perfil.show'))
        ->assertRedirect(route('login'));
});

test('Usuario autenticado consulta su perfil de contribuyente con Inertia', function () {
    $user = User::factory()->create([
        'name' => 'Comerciante Huancayo',
        'email' => 'comercio@huancayo.pe',
        'telefono' => '964112233',
    ]);

    actingAs($user);

    get(route('perfil.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Perfil/PerfilUsuario')
            ->where('user.id', $user->id)
            ->where('user.name', 'Comerciante Huancayo')
            ->where('user.email', 'comercio@huancayo.pe')
            ->where('user.telefono', '964112233')
        );
});

test('Usuario autenticado actualiza sus datos de contacto en mi-cuenta', function () {
    $user = User::factory()->create([
        'name' => 'Nombre Inicial',
        'email' => 'inicial@huancayo.pe',
        'telefono' => '999888777',
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => 'Nombre Actualizado',
        'email' => 'nuevo@huancayo.pe',
        'telefono' => '964555666',
        'nombre_comercial' => 'Nuevo Nombre Comercial',
        'direccion_fiscal' => 'Jr. Real 500',
    ])
        ->assertRedirect(route('perfil.show'))
        ->assertSessionHas('success', 'Perfil actualizado correctamente.');

    $user->refresh();
    expect($user->name)->toBe('Nombre Actualizado')
        ->and($user->email)->toBe('nuevo@huancayo.pe')
        ->and($user->telefono)->toBe('964555666');
});

test('Usuario autenticado actualiza su contraseña exitosamente desde mi-cuenta', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password_antiguo_123'),
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'current_password' => 'password_antiguo_123',
        'password' => 'password_nuevo_456',
        'password_confirmation' => 'password_nuevo_456',
    ])
        ->assertRedirect(route('perfil.show'))
        ->assertSessionHas('success', 'Perfil actualizado correctamente.');

    $user->refresh();
    expect(Hash::check('password_nuevo_456', $user->password))->toBeTrue();
});

test('Usuario no puede actualizar contraseña si la contraseña actual es incorrecta', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password_correcto_123'),
    ]);

    actingAs($user);

    put(route('perfil.update'), [
        'name' => $user->name,
        'email' => $user->email,
        'current_password' => 'password_incorrecto',
        'password' => 'password_nuevo_456',
        'password_confirmation' => 'password_nuevo_456',
    ])
        ->assertSessionHasErrors(['current_password']);

    $user->refresh();
    expect(Hash::check('password_correcto_123', $user->password))->toBeTrue();
});
