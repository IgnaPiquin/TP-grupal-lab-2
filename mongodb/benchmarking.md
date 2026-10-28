# Benchmark de consultas entre MongoDB y Oracle

## Qué se midió

Se compararon dos lecturas representativas del gestor IAM con 5.000 empleados sintéticos y 5.000 solicitudes sintéticas en cada motor:

1. Accesos efectivos por empleado: roles heredados del puesto y asignaciones directas, expandidos hasta aplicación y permiso.
2. Detalle de solicitudes pendientes: solicitud, solicitante, rol pedido, aprobación, aprobador y permisos incluidos en el rol.

Los scripts cuentan las filas producidas para obligar a recorrer el resultado completo. En ambos motores las cardinalidades coincidieron: 12.500 combinaciones empleado/rol/aplicación/permiso y 7.500 combinaciones solicitud/aplicación/permiso.

## Carga equivalente

La carga sintética alterna dos perfiles. En 2.500 empleados, el puesto aporta el rol `ANALISTA_TI` con un permiso y la asignación directa aporta `AUDITOR` con dos permisos. En los otros 2.500, el puesto aporta `APROBADOR_RRHH` con un permiso y la asignación directa aporta `CONSULTA_FINANZAS` con uno. Cada solicitud queda pendiente, pide el rol de auditoría o finanzas correspondiente y tiene un único paso pendiente asignado al rol aprobador.

En Oracle esto ocupa 5.000 filas en cada una de `EMPLEADO`, `EMPLEADO_ROL`, `SOLICITUD` y `APROBACION`. En MongoDB cada empleado y cada solicitud es un agregado autocontenido. Para que los filtros sean equivalentes, los documentos MongoDB también guardan el estado activo del solicitante y del aprobador.

Los identificadores de benchmark están separados de los dos registros de demostración. El script Oracle se ejecuta una vez sobre el esquema recién cargado; el script MongoDB usa `replaceOne` con `upsert`, de modo que puede repetirse sin duplicar documentos.

## Resultados funcionales y de rendimiento

Las mediciones se hicieron el 28 de octubre de 2026. En Oracle APEX se ejecutó cinco veces el script `TP IAM - 05 benchmark consultas`. La columna `ELAPSED` de APEX muestra segundos con dos decimales; se convierten a milisegundos en la tabla. En MongoDB se ejecutó cinco veces cada agregación desde `mongosh`, cronometrando con `Date.now()` desde antes de `aggregate()` hasta que `toArray()` recibió el resultado.

| Caso | Filas Oracle | Oracle: 5 ejecuciones (ms) | Mediana Oracle y rango (ms) | Filas MongoDB | MongoDB: 5 ejecuciones (ms) | Mediana MongoDB y rango (ms) |
|---|---:|---|---:|---:|---|---:|
| Accesos efectivos | 12.500 | 290, 140, 20, 30, 20 | 30 (20-290) | 12.500 | 172, 189, 216, 211, 203 | 203 (172-216) |
| Solicitudes pendientes | 7.500 | 130, 100, 10, 10, 10 | 10 (10-130) | 7.500 | 109, 113, 107, 117, 110 | 110 (107-117) |

En las ejecuciones observadas, la mediana reportada por APEX fue menor para las dos consultas. Sin embargo, los intervalos de las primeras ejecuciones Oracle son amplios y las dos mediciones no usan el mismo entorno ni exactamente el mismo cronómetro. Estos datos permiten describir lo observado en esta prueba, pero no demostrar que un motor sea más rápido en general.

## Límites de la comparación

- Oracle corre en el servicio hospedado Oracle APEX; MongoDB 8.3.7 corre localmente en Windows y se accede por loopback con `mongosh` 2.9.2. La capacidad del servidor Oracle y la del equipo local no están igualadas.
- Oracle APEX informa el tiempo de sus sentencias SQL en segundos redondeados a centésimas. MongoDB informa milisegundos enteros medidos en el cliente `mongosh`, incluido el viaje local entre cliente y servidor.
- Se hicieron cinco ejecuciones por consulta. Las primeras observaciones Oracle fueron considerablemente más lentas que las siguientes, por lo que caché, calentamiento y carga variable del servicio pueden influir.
- La prueba no crea índices secundarios manuales. Las claves primarias y restricciones `UNIQUE` de Oracle conservan los mecanismos que el motor necesita para implementar esas restricciones; MongoDB mantiene su índice automático de `_id`.
- La carga es sintética, pequeña y homogénea. No representa la distribución, concurrencia ni hardware de un entorno de producción.

Para obtener una comparación estricta habría que ejecutar ambos motores con recursos equivalentes, repetir la carga y fijar el estado de caché, concurrencia y medición. Oracle APEX no permite controlar ni conocer todos esos parámetros del servicio compartido.

## Cómo reproducir

En Oracle APEX SQL Workshop, ejecutar `01_modelo_iam.sql`, `02_insercion_datos_iam.sql`, `03_operaciones_iam.sql` y luego `04_datos_benchmark_5000.sql`. Ejecutar cinco veces `05_benchmark_consultas.sql` o el script guardado `TP IAM - 05 benchmark consultas`. La carga SQL es de una sola ejecución por esquema porque usa identificadores fijos.

En una instancia MongoDB local, ejecutar los cinco scripts listados en [`README.md`](README.md). `05_benchmark_consultas.js` comprueba que los conteos permanezcan en 12.500 y 7.500 y muestra los milisegundos de cada repetición.

Los scripts `.js` son instrucciones de `mongosh`, no una aplicación JavaScript con un driver externo. Las operaciones de consulta son agregaciones propias de MongoDB y recorren los documentos embebidos sin `$lookup`.

## Fuentes técnicas

- MongoDB explica la elección entre documentos embebidos y referencias según el patrón de consulta: [Enforce Data Consistency with Embedding](https://www.mongodb.com/docs/manual/data-modeling/enforce-consistency/embed-data/).
- MongoDB documenta la validación de estructura y tipos con `$jsonSchema`: [Specify JSON Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/).
- Oracle documenta la ejecución de comandos desde SQL Workshop: [Using the Command Editor](https://docs.oracle.com/en/database/oracle/apex/26.2/aeutl/using-command-editor.html).
- Oracle documenta la ejecución de scripts y la visualización de resultados en SQL Workshop: [Using SQL Scripts](https://docs.oracle.com/en/database/oracle/apex/26.2/aeutl/using-sql-scripts.html).
