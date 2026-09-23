<?php

namespace Database\Seeders;

use App\Models\CategoriaSubsanacion;
use App\Models\ProveedorRecurso;
use App\Models\RecursoEducativo;
use App\Models\User;
use Illuminate\Database\Seeder;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => Hash::make('password')]
        );

        $this->seedRecursosEducativos();
        $this->seedCategoriasYProveedoresRecursos();
    }

    /**
     * Recursos educativos de micro-learning vinculados al checklist de autoevaluación.
     * Cada recurso se asocia a un codigo_normativo existente en ItseRiskService::getCatalogoChecklist().
     */
    private function seedRecursosEducativos(): void
    {
        $recursos = [
            [
                'codigo_normativo' => 'EXTINTOR_PQS',
                'titulo' => 'Extintor PQS: cómo verificar el manómetro y la operatividad',
                'descripcion_didactica' => 'Video educativo que enseña a revisar la aguja del manómetro en la zona verde, el precinto, la tarjeta de mantenimiento y la vigencia de la carga del extintor PQS antes de una inspección.',
                'tipo' => 'YOUTUBE',
                'url' => 'https://www.youtube.com/watch?v=HjS1NE54ap0',
                'base_legal' => 'NTP 350.043-1 / RNE A.130 Art. 163',
                'evidencia_sugerida' => 'Foto del manómetro con la aguja en zona verde y de la tarjeta de mantenimiento vigente.',
            ],
            [
                'codigo_normativo' => 'LUCES_EMERG',
                'titulo' => 'Luz de emergencia: botón de test y autonomía de batería',
                'descripcion_didactica' => 'Video que muestra cómo usar el botón de prueba de los luminarios de emergencia y verificar la autonomía mínima de la batería (90 minutos) para mantener operativa la vía de evacuación.',
                'tipo' => 'YOUTUBE',
                'url' => 'https://www.youtube.com/watch?v=_frRgvwU8mA',
                'base_legal' => 'CNE-U',
                'evidencia_sugerida' => 'Foto o video corto del luminario con el test activado y la batería encendida sin red.',
            ],
            [
                'codigo_normativo' => 'TERMOMAGNETICO',
                'titulo' => 'Diferencia entre llave termomagnética y diferencial de 30mA',
                'descripcion_didactica' => 'Video que explica la diferencia entre el interruptor termomagnético (protege la instalación contra sobrecargas) y el interruptor diferencial de 30 mA (protege a las personas contra fugas a tierra).',
                'tipo' => 'YOUTUBE',
                'url' => 'https://www.youtube.com/watch?v=o4MOsqcJixA',
                'base_legal' => 'CNE-U Regla 150-400 / R.M. 175-2008-MEM',
                'evidencia_sugerida' => 'Foto del tablero con el diferencial de 30 mA instalado y su botón de test.',
            ],
            [
                'codigo_normativo' => 'EVACUACION',
                'titulo' => 'Rutas de evacuación: señalización y ancho mínimo de pasillo',
                'descripcion_didactica' => 'Video educativo sobre diseño y revisión de medios de evacuación: señalización de salidas, pasillos despejados y ancho útil mínimo de 0.90 m - 1.20 m en vías de escape.',
                'tipo' => 'YOUTUBE',
                'url' => 'https://www.youtube.com/watch?v=F0CjEP4zy7Q',
                'base_legal' => 'RNE Norma A.010 Art. 25 y A.130 Art. 13',
                'evidencia_sugerida' => 'Foto del pasillo medido con cinta métrica y de las señales de salida visibles.',
            ],
        ];

        foreach ($recursos as $recurso) {
            RecursoEducativo::updateOrCreate(
                ['codigo_normativo' => $recurso['codigo_normativo']],
                $recurso
            );
        }
    }

    /**
     * Directorio referencial de categorías y proveedores de subsanación del
     * Valle del Mantaro. Datos comunitarios orientativos para que el ciudadano
     * encuentre apoyo cercano; no constituyen recomendación ni relación con la
     * inspección oficial.
     */
    private function seedCategoriasYProveedoresRecursos(): void
    {
        $categorias = [
            [
                'codigo' => 'EXTINTOR',
                'nombre' => 'Extintores y recargas',
                'descripcion' => 'Venta, recarga y mantenimiento de extintores PQS.',
            ],
            [
                'codigo' => 'ELECTRICO',
                'nombre' => 'Materiales e instalaciones eléctricas',
                'descripcion' => 'Tableros, llaves termomagnéticas, diferenciales y luminarios de emergencia.',
            ],
            [
                'codigo' => 'SENALETICA',
                'nombre' => 'Señalética y medios de evacuación',
                'descripcion' => 'Señales de seguridad, rutas de evacuación y carteles de salida.',
            ],
            [
                'codigo' => 'ARQUITECTURA',
                'nombre' => 'Arquitectura y remodelaciones',
                'descripcion' => 'Adecuación de ambientes, puertas de emergencia y protección de estructuras.',
            ],
        ];

        foreach ($categorias as $categoria) {
            CategoriaSubsanacion::updateOrCreate(
                ['codigo' => $categoria['codigo']],
                $categoria
            );
        }

        $proveedores = [
            [
                'categoria_codigo' => 'EXTINTOR',
                'razon_social' => 'Extintores Centro del Mantaro S.A.C.',
                'nombre_comercial' => 'Extintores Huancayo',
                'telefono' => '+51964752010',
                'whatsapp' => '+51964752010',
                'direccion' => 'Jr. Cajamarca 240, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.0675,
                'longitud' => -75.2090,
                'servicios_ofrecidos' => 'Recarga de extintores PQS, mantenimiento y revisión de manómetros.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'razon_social' => 'Comercial El Tambino E.I.R.L.',
                'nombre_comercial' => 'Ferretería El Tambino',
                'telefono' => '+51963488122',
                'whatsapp' => '+51963488122',
                'direccion' => 'Av. Huancavelica 1520, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.0550,
                'longitud' => -75.2200,
                'servicios_ofrecidos' => 'Llaves termomagnéticas, diferenciales 30mA y luminarios de emergencia.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'razon_social' => 'Materiales Eléctricos Próceres E.I.R.L.',
                'nombre_comercial' => 'Electro Materiales Próceres',
                'telefono' => '+51998240018',
                'whatsapp' => '+51998240018',
                'direccion' => 'Av. Próceres 1030, Chilca',
                'distrito' => 'Chilca',
                'latitud' => -12.0850,
                'longitud' => -75.2050,
                'servicios_ofrecidos' => 'Tableros de distribución, interruptores termomagnéticos y luces de emergencia.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'SENALETICA',
                'razon_social' => 'Señalética Andina E.I.R.L.',
                'nombre_comercial' => 'Andina Señalética',
                'telefono' => '+51973560944',
                'whatsapp' => '+51973560944',
                'direccion' => 'Jr. Ancash 318, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.0660,
                'longitud' => -75.2075,
                'servicios_ofrecidos' => 'Señalización de rutas de evacuación, carteles de salida y señalética.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ARQUITECTURA',
                'razon_social' => 'Constructora y Remodelaciones Valle del Mantaro S.A.C.',
                'nombre_comercial' => 'Remodelaciones Huancayo',
                'telefono' => '+51948300117',
                'whatsapp' => '+51948300117',
                'direccion' => 'Av. Huancavelica 1610, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.0540,
                'longitud' => -75.2215,
                'servicios_ofrecidos' => 'Adecuación de ambientes, puertas de emergencia y protección de estructuras.',
                'activo' => true,
            ],
        ];

        foreach ($proveedores as $proveedor) {
            $categoria = CategoriaSubsanacion::where('codigo', $proveedor['categoria_codigo'])->firstOrFail();
            unset($proveedor['categoria_codigo']);

            ProveedorRecurso::updateOrCreate(
                ['razon_social' => $proveedor['razon_social'], 'distrito' => $proveedor['distrito']],
                array_merge($proveedor, ['categoria_id' => $categoria->id])
            );
        }
    }
}
