# Implementación MongoDB: gestor de identidades y accesos

Esta carpeta contiene una implementación de ejemplo de IAM modelada con agregados documentales y ejecutable con `mongosh`.

## Modelo documental

Se usan dos colecciones como raíces de agregados:

| Colección | Datos embebidos | Consulta que resuelve |
|---|---|---|
| `empleados` | Datos del empleado, área, puesto, roles heredados por el puesto y asignaciones directas. Cada rol contiene sus aplicaciones y permisos. | Conocer en una lectura el perfil y los accesos vigentes de una persona. |
| `solicitudes` | Copia contextual del solicitante, rol pedido y sus aplicaciones y permisos, responsable y rol de aprobación, pasos de aprobación y eventos de auditoría. | Consultar o modificar una solicitud con toda la información necesaria en el mismo documento. |

`Área`, `Puesto`, `Rol`, `Aplicación`, `Permiso`, `Aprobación` y `Auditoría` son subdocumentos donde corresponden; no se crean colecciones de catálogo que deban consultarse para completar otra entidad. Los documentos no contienen referencias como `areaId`, `puestoId`, `rolId`, `aplicacionId`, `solicitanteId` o `aprobadorId`, y las consultas no usan `$lookup`.

Cada documento incluye su propio `_id`. El `legajo` aparece como dato completo de la persona embebida en la solicitud; al aprobarla se usa como clave natural para actualizar el agregado del empleado. La solicitud ya contiene el contexto del solicitante y no se consulta otra colección para enriquecerla.

Se duplican snapshots de roles y datos organizacionales en los agregados que los necesitan. Así se evita reconstruir relaciones mediante consultas, a cambio de tener que actualizar las copias cuando cambia el catálogo. La aprobación y sus eventos son acotados dentro de cada solicitud; el historial no se adjunta entero a cada empleado.

Los validadores `$jsonSchema` controlan estructura y tipos. No reemplazan todas las reglas de negocio. Los scripts no crean índices explícitos; MongoDB crea automáticamente el índice propio de `_id`.

## Requisitos

- Un servidor MongoDB accesible y `mongosh`.
- La base de ejemplo se llama `gestor_accesos_iam_embebido` y usa `mongodb://127.0.0.1:27017`.

`mongosh` es el cliente; no inicia el servidor. En el equipo donde se ejecutó esta implementación, el servidor MongoDB está en `C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe` y `mongosh` está disponible en el `PATH`. Ajustar la ruta si la versión está instalada en otro directorio.

## Ejecución local

En una primera terminal de PowerShell, iniciar el servidor de prueba:

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\iam-mongodb-data" | Out-Null
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "$env:TEMP\iam-mongodb-data" --bind_ip 127.0.0.1 --port 27017
```

Dejarla abierta. Desde la raíz del repositorio, ejecutar en una segunda terminal:

```powershell
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\01_crear_estructura.js
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\02_cargar_datos_demo.js
mongosh "mongodb://127.0.0.1:27017" --file .\mongodb\03_operaciones.js
```

`01_crear_estructura.js` crea o actualiza los validadores de las dos colecciones. `02_cargar_datos_demo.js` reemplaza los dos empleados demo y los devuelve a su estado inicial. `03_operaciones.js` crea las solicitudes demo si faltan, aprueba la primera, actualiza el rol del empleado y ejecuta consultas sobre cada agregado.

La ejecución se verificó localmente en MongoDB 8.3.7 y `mongosh` 2.9.2. Los resultados y la comparación con Oracle están en [`benchmarking.md`](benchmarking.md).

Si usan MongoDB Atlas u otro servidor, reemplacen la URI local y no guarden contraseñas ni cadenas privadas en el repositorio.
