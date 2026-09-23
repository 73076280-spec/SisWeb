<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\EvaluacionController;
use Illuminate\Support\Facades\Route;

// Redirige la raíz directo al asistente estilo Airbnb
Route::get('/', [EvaluacionController::class, 'index'])->name('autoevaluacion.index');
Route::get('/autoevaluacion', [EvaluacionController::class, 'index'])->name('autoevaluacion.index');
Route::post('/autoevaluacion', [EvaluacionController::class, 'store'])->name('autoevaluacion.store');
Route::get('/autoevaluacion/resultado/{uuid}', [EvaluacionController::class, 'resultado'])->name('autoevaluacion.resultado');

// Simulación de revisión in situ del establecimiento por el propio ciudadano
Route::get('/autoevaluacion/revision/{uuid}', [EvaluacionController::class, 'simulacionRevision'])->name('autoevaluacion.simulacion');
Route::post('/autoevaluacion/revision/{uuid}', [EvaluacionController::class, 'guardarSimulacion'])->name('autoevaluacion.simulacion.store');

// Plan de subsanación preventiva
Route::get('/autoevaluacion/subsanacion/{uuid}', [EvaluacionController::class, 'panelSubsanacion'])->name('autoevaluacion.subsanacion');
Route::post('/autoevaluacion/subsanacion/{uuid}', [EvaluacionController::class, 'guardarSubsanacion'])->name('autoevaluacion.subsanacion.store');

// Directorio de proveedores de subsanación cercanos (algoritmo de proximidad geoespacial)
Route::get('/autoevaluacion/recursos-cercanos/{codigo}', [EvaluacionController::class, 'recursosCercanos'])
    ->name('autoevaluacion.recursos-cercanos');

// Informe de autoevaluación preventiva
Route::get('/autoevaluacion/informe/{uuid}', [EvaluacionController::class, 'informe'])->name('autoevaluacion.informe');

// Conversión transaccional de invitado a registrado y retención ciudadana
Route::post('/autoevaluacion/vincular-cuenta', [EvaluacionController::class, 'vincularCuenta'])
    ->middleware('throttle:30,1')
    ->name('autoevaluacion.vincular-cuenta');
Route::get('/mis-autoevaluaciones', [EvaluacionController::class, 'misEvaluaciones'])
    ->middleware('auth')
    ->name('mis-autoevaluaciones');

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login');
Route::post('/registro', [AuthController::class, 'register'])->middleware('throttle:5,1')->name('registro');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/usuario', [AuthController::class, 'user'])->name('usuario');
