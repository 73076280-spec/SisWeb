<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\EvaluacionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CheckITSE Huancayo — Rutas Ciudadanas Definitivas (Fase 6)
|--------------------------------------------------------------------------
| Flujo cívico preventivo: ingreso anónimo opcional, formulario de datos
| básicos, autoevaluación guiada, resultado orientativo, reevaluación
| estrella (A -> B, C), informe descargable y conversión opcional de cuenta.
*/

// Portada pública y Asistente ciudadano preventivo (UX-02)
Route::get('/', [EvaluacionController::class, 'index'])->name('autoevaluacion.index');
Route::get('/autoevaluacion', fn () => redirect()->route('autoevaluacion.nueva'));
Route::get('/autoevaluacion/nueva', [EvaluacionController::class, 'nueva'])->name('autoevaluacion.nueva');
Route::post('/autoevaluacion', [EvaluacionController::class, 'store'])->name('autoevaluacion.store');
// Desacoplado en UX-06.2: Las evaluaciones V2 redirigen dinámicamente (302) a resumen;
// las evaluaciones legacy conservan acceso controlado para trazabilidad y compatibilidad de suite.
Route::get('/autoevaluacion/resultado/{uuid}', [EvaluacionController::class, 'resultado'])->name('autoevaluacion.resultado');

// Checklist dinámico normativo (Bloque 3 — Paso 3)
Route::get('/autoevaluacion/{uuid}/checklist', [EvaluacionController::class, 'checklistDinamico'])->name('autoevaluacion.checklist');
Route::post('/autoevaluacion/{uuid}/checklist', [EvaluacionController::class, 'guardarDeclaracionesChecklist'])->name('autoevaluacion.checklist.store');
Route::get('/api/autoevaluaciones/{uuid}/checklist', [EvaluacionController::class, 'checklistDinamico'])->name('api.autoevaluaciones.checklist');
Route::post('/api/autoevaluaciones/{uuid}/checklist', [EvaluacionController::class, 'guardarDeclaracionesChecklist'])->name('api.autoevaluaciones.checklist.store');

// Resumen descriptivo y orientativo (Bloque 3 — Paso 5)
Route::get('/autoevaluacion/{uuid}/resumen', [EvaluacionController::class, 'resumen'])->name('autoevaluacion.resumen');

// Cierre formal de autoevaluación (Bloque 3 — Paso 8)
Route::post('/autoevaluacion/{uuid}/finalizar', [EvaluacionController::class, 'finalizar'])->name('autoevaluacion.finalizar');

// Reevaluación preventiva ciudadana (Modelo estrella inmutable A -> B, C)
Route::get('/autoevaluacion/reevaluar/{uuid}', [EvaluacionController::class, 'iniciarReevaluacion'])->name('autoevaluacion.reevaluar');
Route::post('/autoevaluacion/reevaluar/{uuid}', [EvaluacionController::class, 'storeReevaluacion'])->name('autoevaluacion.reevaluar.store');

// Informe preventivo orientativo (descargable / imprimible)
Route::get('/autoevaluacion/informe/{uuid}', [EvaluacionController::class, 'informe'])->name('autoevaluacion.informe');

// Cuenta ciudadana opcional (registro/conversión de invitado sin fricción)
Route::post('/autoevaluacion/vincular-cuenta', [EvaluacionController::class, 'vincularCuenta'])
    ->middleware('throttle:30,1')
    ->name('autoevaluacion.vincular-cuenta');
Route::get('/mis-autoevaluaciones', [EvaluacionController::class, 'misEvaluaciones'])
    ->middleware('auth')
    ->name('mis-autoevaluaciones');

// Autenticación liviana
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login');
Route::post('/registro', [AuthController::class, 'register'])->middleware('throttle:5,1')->name('registro');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/usuario', [AuthController::class, 'user'])->name('usuario');

/*
|--------------------------------------------------------------------------
| Rutas en Transición Segura (Programadas para retiro en Bloques 7 y 10)
|--------------------------------------------------------------------------
| Mantenidas temporalmente para conservar estabilidad de la suite de pruebas
| preexistente mientras se despliegan los bloques del motor y UI definitiva.
*/

// @deprecated Transición: Simulación in situ (Será retirada en Bloque 7/10)
Route::get('/autoevaluacion/revision/{uuid}', [EvaluacionController::class, 'simulacionRevision'])->name('autoevaluacion.simulacion');
Route::post('/autoevaluacion/revision/{uuid}', [EvaluacionController::class, 'guardarSimulacion'])->name('autoevaluacion.simulacion.store');

// @deprecated Transición: Subsanaciones con evidencia física (Será retirada en Bloque 7/10)
Route::get('/autoevaluacion/subsanacion/{uuid}', [EvaluacionController::class, 'panelSubsanacion'])->name('autoevaluacion.subsanacion');
Route::post('/autoevaluacion/subsanacion/{uuid}', [EvaluacionController::class, 'guardarSubsanacion'])->name('autoevaluacion.subsanacion.store');
Route::get('/autoevaluacion/subsanacion/{uuid}/evidencia/{subsanacion}', [EvaluacionController::class, 'descargarEvidencia'])
    ->name('autoevaluacion.evidencia');

// @deprecated Transición: Proveedores comerciales cercanos (Será retirada en Bloque 7/10)
Route::get('/autoevaluacion/recursos-cercanos/{codigo}', [EvaluacionController::class, 'recursosCercanos'])
    ->name('autoevaluacion.recursos-cercanos');
