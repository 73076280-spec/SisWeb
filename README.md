# 🛡️ CheckITSE Huancayo (SisWeb)

Sistema técnico y preventivo para la gestión de inspecciones de seguridad en edificaciones (ITSE), autoevaluaciones normativas, flujos de subsanación y generación de informes criptográficos.

## 📐 1. Mapeo Global de Arquitectura (Modelo C4 & Modelo 4+1)
- **Modelo C4 (Niveles de Zoom):**
  - *Nivel 1 - Contexto Externo:* Propietarios y comerciantes de Huancayo interactúan con la plataforma web para autoevaluaciones preventivas e informes de seguridad.
  - *Nivel 2 - Contenedores:* Aplicación Monolítica Modular (Backend Laravel 11 + Frontend React 19 / Inertia.js), Base de datos relacional y almacenamiento privado en disco.
  - *Nivel 3 - Componentes:* Separación interna entre motores de negocio (`Services`), controladores de ruta (`Controllers`), modelos Eloquent (`Models`) y vistas interactivas (`Pages`).
  - *Nivel 4 - Código:* Servicios de dominio puro orientados a contratos tipados bajo estándares estrictos de SonarQube (Quality Gate A).
- **Modelo 4+1 (Vistas):** Aborda la vista lógica (modelos y servicios), de procesos (ciclo de vida de autoevaluación y hashes SHA-256), de desarrollo (estructura modular de código) y física (despliegue local/servidor con aislamiento de pruebas `sisweb_test`).

## 🌐 2. Arquitectura Externa (Integración y Entorno)
- **Diagrama de Contexto:** Fronteras del software orientadas a usuarios ciudadanos y autoridades locales, sin dependencias complejas con pasarelas de pago externas.
- **Topología de Infraestructura:** Servidor local / Web Server (Apache/Nginx con PHP 8.2+) bajo protocolos seguros.
- **Protocolos de Comunicación:** Tráfico cifrado mediante HTTPS y comunicación asíncrona de SPA vía Inertia.js (sin necesidad de WebSockets ni gRPC).

## 🔗 3. Conexión entre Componentes (El "Pegamento")
- **Punto de Entrada (Router/Controller):** Las peticiones del usuario son gestionadas de forma centralizada por las rutas web de Laravel y dirigidas a los controladores correspondientes.
- **Estilos de API:** Uso de arquitectura RESTful combinada con el puente nativo de Inertia.js para renderizado de vistas por props.
- **Modelo de Ejecución:** Procesamiento sincrónico transaccional respaldado por transacciones atómicas en base de datos para asegurar el sellado criptográfico.

## 🧠 4. Arquitectura Interna del Backend
- **Patrón General:** Monolito Modular altamente estructurado.
- **Lógica de Negocio (Servicios):** Desacoplada de los controladores mediante clases de servicio especializadas (`ItseRiskService`, `ApplicabilityEngineService`, etc.).
- **Capa de Persistencia:** Base de datos relacional (MySQL/MariaDB) gestionada mediante Eloquent ORM con migraciones versionadas y aislamiento estricto para pruebas (`sisweb_test`).

## 🎨 5. Arquitectura Interna del Frontend
- **Arquitectura de Componentes:** Organización modular basada en React 19, TypeScript, Tailwind CSS v4 y componentes primitivos de Radix UI / shadcn/ui.
- **Gestión de Estado:** Manejo de estado local mediante React Hooks y props tipadas proveídas directamente por Inertia.js desde el backend.
- **Estrategia de Renderizado:** SPA (Single Page Application) orientada al cliente con hidratación rápida y navegación fluida sin recargas de página.

## 🔍 Reporte de Auditoría e Integridad del Sistema
- **Archivos Backend Analizados:** 21 clases/traits PHP.
- **Errores de Sintaxis Detectados:** 🟢 **0 (Sistema 100\% íntegro)**
- **Componentes UI (shadcn/ui):** 6 componentes.
- **Páginas Frontend (React/Inertia):** 15 archivos.
- **Estado SonarQube Quality Gate:** 🟢 **PASSED** (0 New Issues, 0.09% Duplications).

## ⚠️ Reglas Defensivas Obligatorias para Evitar Romper el Sistema
Para mantener el estado de **Quality Gate: Passed** y garantizar cero regresiones, toda modificación futura debe atenerse estrictamente a estas reglas:
1. **Inmutabilidad de Registros:** Jamás alteres registros con estado `REGISTRADA` directamente en la base de datos. Toda corrección debe transicionar por los flujos seguros de reevaluación o subsanación.
2. **Trazabilidad Absoluta por UUID:** Utiliza estrictamente `uuid_trazabilidad` en las rutas de acceso público del ciudadano; evita exponer IDs primarios autoincrementales.
3. **Cero Infracciones en SonarQube:** Todo código nuevo en TypeScript y PHP debe cumplir con las reglas de mantenibilidad (evitar funciones con más de 3 sentencias `return` en PHP, usar `React.ComponentRef` en lugar de `ElementRef` deprecado en React 19, y asegurar props tipadas con `Readonly<...>` en componentes UI).
4. **Aseguramiento Obligatorio con Pruebas:** Antes de dar por finalizado cualquier cambio, ejecuta la suite de pruebas unitarias/integración con aislamiento (`php artisan test`) para certificar que todos los tests estén en verde.

## 🏗️ Inventario de Componentes del Sistema
### Servicios de Negocio (`app/Services/`)
- `ApplicabilityEngineService.php`
- `DirectorioAliadosService.php`
- `GeoLocationService.php`
- `ItseRiskService.php`

### Controladores y Traits
- `C:/xampp/htdocs/SisWeb/app/Http/Controllers/Auth/AuthController.php`
- `C:/xampp/htdocs/SisWeb/app/Http/Controllers/Controller.php`
- `C:/xampp/htdocs/SisWeb/app/Http/Controllers/DirectorioController.php`
- `C:/xampp/htdocs/SisWeb/app/Http/Controllers/EvaluacionController.php`
- `C:/xampp/htdocs/SisWeb/app/Http/Controllers/Traits/EvaluacionHelperTrait.php`

### Modelos Eloquent
- `ActividadComercial.php`
- `Autoevaluacion.php`
- `CategoriaSubsanacion.php`
- `CriterioNormativo.php`
- `HistorialSubsanacion.php`
- `ProveedorRecurso.php`
- `RecursoEducativo.php`
- `ReglaAplicabilidad.php`
- `RespuestaAutoevaluacion.php`
- `SimulacionRevision.php`
- `Subsanacion.php`
- `User.php`

### Páginas Frontend (`resources/js/Pages/`)
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Auth/Login.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Auth/Register.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Directorio/Index.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/AnexoOficial.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Checklist.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/ExpedienteLocal.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Home.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/InformePreventivo.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/MisAutoevaluaciones.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Nueva.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Resultado.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Resumen.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/SimulacionRevision.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/Subsanacion.tsx`
- `C:/xampp/htdocs/SisWeb/resources/js/pages/Evaluacion/components/ResumenHeader.tsx`

## 🔌 Endpoints y Rutas Principales
- `GET /`
- `GET /directorio`
- `GET /nueva`
- `GET /resultado/{uuid}`
- `GET /{uuid}/checklist`
- `GET /{uuid}/resumen`
- `GET /reevaluar/{uuid}`
- `GET /informe/{uuid}`
- `GET /anexo/{uuid}`
- `GET /revision/{uuid}`
- `GET /subsanacion/{uuid}`
- `GET /subsanacion/{uuid}/evidencia/{subsanacion}`
- `GET /recursos-cercanos/{codigo}`
- `GET /mis-autoevaluaciones`
- `GET /api/autoevaluaciones/mis-evaluaciones`
- `GET /mis-autoevaluaciones/{uuid}/expediente`
- `GET /login`
- `GET /registro`
- `GET /usuario`

---*Documentación enterprise, control de calidad y reglas defensivas generadas automáticamente mediante `php artisan readme:generar`.*
