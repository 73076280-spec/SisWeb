<?php

namespace App\Services;

use App\Models\CategoriaSubsanacion;
use App\Models\ProveedorRecurso;

class GeoLocationService
{
    public const TIERRA_RADIO_KM = 6371.0;

    public const FALLBACK_LAT = -12.0680;

    public const FALLBACK_LON = -75.2100;

    public function calcularDistanciaKm(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        if ($lat1 === $lat2 && $lon1 === $lon2) {
            return 0.0;
        }

        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos($lat1Rad) * cos($lat2Rad) * sin($dLon / 2) * sin($dLon / 2);

        return self::TIERRA_RADIO_KM * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /**
     * Busca proveedores de subsanación cercanos a la condición no cumplida.
     *
     * Si no hay resultados dentro del radio solicitado, retorna los proveedores
     * de la categoría ordenados por distancia ascendente (radio extendido).
     *
     * @return array{codigo: string, categoria: string, radio_km: float, radio_extendido: bool, proveedores: array<int, array<string, mixed>>}
     */
    public function buscarProveedoresPorDeficiencia(string $codigoNormativo, float $latUser, float $lonUser, float $radioKm = 5.0): array
    {
        $categoriaCodigo = $this->categoriaParaDeficiencia($codigoNormativo);

        $categoria = CategoriaSubsanacion::with('proveedoresRecursos')
            ->where('codigo', $categoriaCodigo)
            ->first();

        if (! $categoria) {
            return [
                'codigo' => $codigoNormativo,
                'categoria' => $categoriaCodigo,
                'radio_km' => $radioKm,
                'radio_extendido' => false,
                'proveedores' => [],
            ];
        }

        $conDistancia = $categoria->proveedoresRecursos
            ->filter(fn (ProveedorRecurso $proveedor): bool => (bool) $proveedor->activo)
            ->map(fn (ProveedorRecurso $proveedor): array => $this->proveedorConDistancia($proveedor, $latUser, $lonUser));

        $dentroDelRadio = $conDistancia
            ->filter(fn (array $proveedor): bool => $proveedor['distancia_km'] <= $radioKm)
            ->sortBy('distancia_km')
            ->values();

        $radioExtendido = $dentroDelRadio->isEmpty();

        $proveedores = $radioExtendido
            ? $conDistancia->sortBy('distancia_km')->values()
            : $dentroDelRadio;

        return [
            'codigo' => $codigoNormativo,
            'categoria' => $categoriaCodigo,
            'radio_km' => $radioKm,
            'radio_extendido' => $radioExtendido,
            'proveedores' => $proveedores->all(),
        ];
    }

    private function categoriaParaDeficiencia(string $codigoNormativo): string
    {
        return match ($codigoNormativo) {
            'EXTINTOR', 'EXTINTOR_PQS' => 'EXTINTOR',
            'TERMOMAGNETICO', 'LUCES_EMERG' => 'ELECTRICO',
            'EVACUACION', 'SENALETICA' => 'SENALETICA',
            default => 'ARQUITECTURA',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function proveedorConDistancia(ProveedorRecurso $proveedor, float $latUser, float $lonUser): array
    {
        return [
            'id' => $proveedor->id,
            'razon_social' => $proveedor->razon_social,
            'nombre_comercial' => $proveedor->nombre_comercial,
            'telefono' => $proveedor->telefono,
            'whatsapp' => $proveedor->whatsapp,
            'direccion' => $proveedor->direccion,
            'distrito' => $proveedor->distrito,
            'latitud' => $proveedor->latitud,
            'longitud' => $proveedor->longitud,
            'servicios_ofrecidos' => $proveedor->servicios_ofrecidos,
            'distancia_km' => round($this->calcularDistanciaKm($latUser, $lonUser, (float) $proveedor->latitud, (float) $proveedor->longitud), 2),
        ];
    }
}
