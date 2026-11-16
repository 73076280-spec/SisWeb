<?php

namespace App\Jobs;

use App\Models\AnalisisEvidencia;
use App\Services\AI\AnalisisEvidenciaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class AnalisisEvidenciaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [5, 15, 30];

    public function __construct(
        public int $analisisId
    ) {}

    public function handle(AnalisisEvidenciaService $service): void
    {
        $analisis = AnalisisEvidencia::find($this->analisisId);
        if (! $analisis || $analisis->esTerminal()) {
            return;
        }

        $service->procesarAnalisis($analisis);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('AnalisisEvidenciaJob: Fallo definitivo tras reintentos', [
            'analisis_id' => $this->analisisId,
            'error' => $exception?->getMessage(),
        ]);

        $analisis = AnalisisEvidencia::find($this->analisisId);
        if ($analisis && ! $analisis->esTerminal()) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO,
                'mensaje_error' => 'No fue posible completar el análisis de la fotografía tras múltiples intentos. Puede intentar nuevamente.',
                'completado_at' => now(),
            ]);
        }
    }
}
