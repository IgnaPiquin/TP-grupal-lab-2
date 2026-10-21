# Implementación MongoDB: gestor de identidades y accesos

Esta carpeta contiene una implementación de ejemplo del caso IAM con MongoDB y `mongosh`.

## Modelo de documentos

| Colección | Contenido y relaciones |
|---|---|
| `areas` | Sectores de la organización. Los empleados guardan una referencia `areaId`. |
| `puestos` | Puestos y una lista de referencias `roles` para representar la relación puesto-rol. |
| `roles` | Roles y referencias a permisos por aplicación. |
| `aplicaciones` | Aplicaciones con sus permisos como subdocumentos. |
| `empleados` | Datos del empleado, referencias a área y puesto, y asignaciones directas de roles como subdocumentos. |
| `solicitudes` | Una solicitud por empleado y rol; las etapas de aprobación se guardan dentro de la solicitud. |
| `auditoria` | Eventos independientes para conservar un historial que puede crecer con el tiempo. |

El diseño combina referencias para entidades compartidas y arrays de referencias para relaciones de varios a varios. Los pasos de aprobación se embeben en `solicitudes` porque forman parte del flujo de una solicitud y suelen consultarse con ella. La validación `$jsonSchema` controla la forma y los tipos de los documentos; la existencia de las referencias, la unicidad de campos como el email y reglas como impedir la autoaprobación se verifican en las operaciones de la aplicación. La única clave única incluida automáticamente es `_id`.

No se crean índices explícitos en estos scripts.

## Requisitos

- Un servidor MongoDB accesible. Para la configuración local, el ejemplo usa `mongodb://127.0.0.1:27017`.
- `mongosh`, la consola que ejecuta los archivos `.js`.

`mongosh` es el cliente; por sí solo no inicia el servidor de base de datos. En el equipo donde se preparó y ejecutó esta implementación, el servidor MongoDB 8.3.7 está en `C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe` y `mongosh` 2.9.2 está disponible en el `PATH`.

## Ejecución local

Para iniciar una instancia local de prueba en PowerShell, abrir una primera terminal y ejecutar:

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\iam-mongodb-data" | Out-Null
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "$env:TEMP\iam-mongodb-data" --bind_ip 127.0.0.1 --port 27017
```

Dejar esa terminal abierta. Desde la raíz del repositorio, en una segunda terminal, ejecutar:

```powershell
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\01_crear_estructura.js
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\02_cargar_datos_demo.js
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\03_operaciones.js
```

Los tres archivos trabajan con la base `gestor_accesos_iam`. La estructura actualiza validadores si las colecciones ya existen y no elimina datos; la carga crea los documentos de ejemplo que falten; las operaciones conservan el estado de las solicitudes de demostración al volver a ejecutarse.

La ejecución de los tres scripts se verificó localmente. Los resultados y el alcance de esa verificación están en [`benchmarking.md`](benchmarking.md).

Si usan MongoDB Atlas u otro servidor, reemplacen la URI local por la URI del entorno y no guarden contraseñas ni cadenas privadas en el repositorio.

## Archivos

- `01_crear_estructura.js`: crea colecciones y validadores de documentos.
- `02_cargar_datos_demo.js`: carga empleados, áreas, puestos, roles, aplicaciones y permisos de ejemplo.
- `03_operaciones.js`: crea solicitudes, valida una aprobación, otorga el rol aprobado y consulta solicitudes, accesos efectivos y auditoría.
- `benchmarking.md`: comparación del modelo documental con el modelo relacional del archivo `../01_modelo_iam.sql`.
