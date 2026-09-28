<?php

use App\Http\Middleware\HandleGuestSession;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            HandleGuestSession::class,
        ]);

        // Visitantes que acceden a una ruta protegida (p. ej. Mis Autoevaluaciones)
        // vuelven al inicio, donde pueden crear o iniciar sesión en su cuenta.
        $middleware->redirectGuestsTo(fn () => route('autoevaluacion.index'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
