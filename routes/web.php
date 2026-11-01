<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DirectorioController;
use App\Http\Controllers\EvaluacionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CheckITSE Huancayo — Rutas Ciudadanas
|--------------------------------------------------------------------------
| Flujo cívico preventivo: ingreso anónimo opcional, formulario de datos
| básicos, autoevaluación guiada, resultado orientativo, reevaluación
| estrella (A -> B, C), informe descargable y conversión opcional de cuenta.
*/

// Portada pública y directorio
Route::get('/', [EvaluacionController::class, 'index'])->name('autoevaluacion.index');
Route::get('/directorio', [DirectorioController::class, 'index'])->name('directorio.index');
Route::post('/directorio/afiliarse', [DirectorioController::class, 'solicitarAfiliacion'])->name('directorio.afiliarse');

// Flujo de Autoevaluación Ciudadana
Route::prefix('autoevaluacion')->name('autoevaluacion.')->group(function () {
    Route::redirect('/', '/autoevaluacion/nueva');
    Route::get('/nueva', [EvaluacionController::class, 'nueva'])->name('nueva');
    Route::post('/', [EvaluacionController::class, 'store'])->name('store');

    // Rutas asociadas a una autoevaluación específica (UUID)
    Route::where(['uuid' => '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'])->group(function () {
        // Redirección dinámica 302 a resumen (legacy compatible)
        Route::get('/resultado/{uuid}', [EvaluacionController::class, 'resultado'])->name('resultado');

        // Checklist dinámico normativo (Bloque 3 — Paso 3)
        Route::get('/{uuid}/checklist', [EvaluacionController::class, 'checklistDinamico'])->name('checklist');
        Route::post('/{uuid}/checklist', [EvaluacionController::class, 'guardarDeclaracionesChecklist'])->name('checklist.store');

        // Resumen descriptivo y orientativo (Bloque 3 — Paso 5)
        Route::get('/{uuid}/resumen', [EvaluacionController::class, 'resumen'])->name('resumen');

        // Cierre formal de autoevaluación (Bloque 3 — Paso 8)
        Route::post('/{uuid}/finalizar', [EvaluacionController::class, 'finalizar'])->name('finalizar');

        // Reevaluación preventiva ciudadana (Modelo estrella inmutable A -> B, C)
        Route::get('/reevaluar/{uuid}', [EvaluacionController::class, 'iniciarReevaluacion'])->name('reevaluar');
        Route::post('/reevaluar/{uuid}', [EvaluacionController::class, 'storeReevaluacion'])->name('reevaluar.store');

        // Informes preventivos y anexos oficiales
        Route::get('/informe/{uuid}', [EvaluacionController::class, 'informe'])->name('informe');
        Route::get('/anexo/{uuid}', [EvaluacionController::class, 'anexoOficial'])->name('anexo');

        // Subsanación directa limpia de criterios observados
        Route::get('/{uuid}/subsanar-items', [EvaluacionController::class, 'subsanarItems'])->name('subsanar_items');
        Route::post('/{uuid}/declarar-subsanado', [EvaluacionController::class, 'declararSubsanado'])->name('declarar_subsanado');

        /*
        | Transición: Mantenidas para compatibilidad de tests (Bloques 7 y 10)
        */
        Route::get('/revision/{uuid}', [EvaluacionController::class, 'simulacionRevision'])->name('simulacion');
        Route::post('/revision/{uuid}', [EvaluacionController::class, 'guardarSimulacion'])->name('simulacion.store');
        Route::get('/subsanacion/{uuid}', [EvaluacionController::class, 'panelSubsanacion'])->name('subsanacion');
        Route::post('/subsanacion/{uuid}', [EvaluacionController::class, 'guardarSubsanacion'])->name('subsanacion.store');
        Route::get('/subsanacion/{uuid}/evidencia/{subsanacion}', [EvaluacionController::class, 'descargarEvidencia'])->name('evidencia');
    });

    // Rutas sin restricción de UUID
    Route::get('/recursos-cercanos/{codigo}', [EvaluacionController::class, 'recursosCercanos'])->name('recursos-cercanos');

    // Conversión de cuenta ciudadana (registro de invitado)
    Route::post('/vincular-cuenta', [EvaluacionController::class, 'vincularCuenta'])
        ->middleware('throttle:30,1')
        ->name('vincular-cuenta');
});

// Alias compatibles con especificación de navegación
Route::get('/evaluacion/create', [EvaluacionController::class, 'nueva'])->name('evaluacion.create');
Route::get('/evaluacion/{uuid}', [EvaluacionController::class, 'resultado'])->name('evaluacion.show')->whereUuid('uuid');

// APIs internas consumidas por componentes interactivos
Route::prefix('api/autoevaluaciones')->name('api.autoevaluaciones.')->whereUuid('uuid')->group(function () {
    Route::get('/{uuid}/checklist', [EvaluacionController::class, 'checklistDinamico'])->name('checklist');
    Route::post('/{uuid}/checklist', [EvaluacionController::class, 'guardarDeclaracionesChecklist'])->name('checklist.store');
});

// Área personal del ciudadano registrado (requiere sesión activa)
Route::middleware('auth')->group(function () {
    Route::get('/panel-ciudadano', [EvaluacionController::class, 'dashboard'])->name('dashboard');
    Route::get('/mi-cuenta', [EvaluacionController::class, 'perfil'])->name('perfil.show');
    Route::put('/mi-cuenta', [EvaluacionController::class, 'updatePerfil'])->name('perfil.update');

    Route::get('/mis-autoevaluaciones', [EvaluacionController::class, 'misEvaluaciones'])->name('mis-autoevaluaciones');
    Route::get('/api/autoevaluaciones/mis-evaluaciones', [EvaluacionController::class, 'misEvaluaciones'])->name('api.autoevaluaciones.mis-evaluaciones');
    Route::get('/mis-autoevaluaciones/{uuid}/expediente', [EvaluacionController::class, 'expediente'])->name('mis-autoevaluaciones.expediente')->whereUuid('uuid');
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});

// Autenticación liviana (Inertia + Throttle preventivo)
Route::middleware('guest')->group(function () {
    Route::get('/login', fn () => inertia('Auth/Login'))->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login.store');

    Route::get('/registro', fn () => inertia('Auth/Register'))->name('register');
    Route::post('/registro', [AuthController::class, 'register'])->middleware('throttle:5,1')->name('register.store');
});

// Identidad híbrida (PÚBLICA: devuelve null para invitados o el usuario si hay sesión)
Route::get('/usuario', [AuthController::class, 'user'])->name('usuario');
