# Benchmarking: MongoDB documental y Oracle relacional

## Alcance

La consigna pide comparar paradigmas. Este benchmarking es una comparación del diseño documental de MongoDB con el diseño relacional de Oracle del archivo `01_modelo_iam.sql`, aplicada al mismo caso de gestión de identidades y accesos.

La comparación del paradigma es cualitativa. No se presentan tiempos de rendimiento porque para compararlos harían falta operaciones equivalentes implementadas en ambos motores, el mismo volumen de datos y el mismo equipo y carga de consultas.

## Resultado de la ejecución funcional

Se ejecutaron los tres scripts de la implementación en un servidor local MongoDB 8.3.7, usando `mongosh` 2.9.2 en Windows x64 y la base `gestor_accesos_iam`.

| Operación | Resultado observado |
|---|---|
| Creación de estructura | Se crearon las siete colecciones con sus validadores `$jsonSchema`. |
| Carga de datos demo | 2 áreas, 2 puestos, 4 roles, 2 aplicaciones y 2 empleados. |
| Alta de solicitudes | Se crearon 2 solicitudes de acceso. |
| Aprobación | `SOL-DEMO-001` fue aprobada por un empleado cuyo puesto le otorga el rol aprobador; el rol solicitado quedó asignado. |
| Solicitudes pendientes | `SOL-DEMO-002` siguió en estado `EN_APROBACION`. |
| Consulta de accesos | Para `EMP-0001` se obtuvieron 3 permisos efectivos, incluyendo los heredados del puesto y del rol aprobado. |
| Auditoría | Se conservaron 3 eventos: creación de las dos solicitudes y aprobación de la primera. |
| Reejecución de scripts | La estructura actualizó validadores, la carga conservó los registros y las operaciones mantuvieron los estados sin duplicar datos. |

Estos resultados verifican el flujo funcional y la persistencia del modelo documental. No son una medición de latencia o rendimiento; los datos de demostración son pequeños y no se ejecutó una carga equivalente en Oracle.

## Comparación

| Criterio | MongoDB documental | Oracle relacional | Efecto para el caso IAM |
|---|---|---|---|
| Estructura | Documentos BSON repartidos en colecciones; una solicitud incluye sus pasos de aprobación. | Tablas separadas para solicitudes y aprobaciones, conectadas por claves. | MongoDB puede recuperar una solicitud con su flujo en un documento; Oracle representa explícitamente cada relación. |
| Puesto-rol y rol-permiso | Arrays con referencias a identificadores compartidos. | Tablas intermedias `puesto_rol` y `rol_permiso`. | Mongo evita algunas tablas de unión en las consultas, pero la aplicación debe comprobar que cada referencia exista. |
| Aplicación y permisos | Los permisos se guardan como subdocumentos dentro de cada aplicación; los roles conservan referencias a esos permisos. | Permisos en una tabla relacionada con aplicaciones y roles mediante claves foráneas y una tabla intermedia. | En MongoDB, los datos que describen una aplicación se pueden leer juntos; en Oracle las restricciones mantienen las relaciones explícitas. |
| Aprobaciones | Subdocumentos dentro de `solicitudes`; una actualización de un paso modifica el documento de la solicitud. | Registros de `aprobacion` relacionados con `solicitud`. | El modelo MongoDB se ajusta a la consulta de una solicitud completa. Oracle facilita consultar y reportar aprobaciones de forma independiente. |
| Auditoría | Colección `auditoria` separada para mantener los eventos independientes de los documentos que pueden crecer. | Tabla `log_auditoria` con referencias a empleados, solicitudes y aprobaciones. | Ambos modelos conservan el historial; Oracle puede exigir referencias mediante claves foráneas. |
| Integridad | `$jsonSchema` valida la forma y los tipos. En esta implementación no se crean índices únicos ni claves foráneas; la existencia de referencias y la unicidad de email/códigos quedan a cargo de la aplicación. | Claves primarias, foráneas, restricciones y valores permitidos declarados en el esquema. | Oracle ofrece más integridad declarativa en este modelo. En MongoDB hay que escribir y mantener validaciones de aplicación para las relaciones. |
| Evolución | Permite agregar campos a documentos y ajustar validadores cuando cambian las necesidades. | Los cambios de estructura requieren modificar el esquema y considerar las relaciones afectadas. | MongoDB da flexibilidad a los documentos; Oracle mantiene un modelo explícito y uniforme. |

## Ventajas y desventajas observadas

### MongoDB

**Ventajas**

- Una solicitud y sus aprobaciones forman un documento de trabajo que puede leerse y modificarse como una unidad.
- Los permisos de una aplicación pueden almacenarse juntos con los datos descriptivos de esa aplicación.
- La estructura admite evolucionar agregando campos, con validadores para limitar los tipos y valores.

**Desventajas**

- MongoDB no comprueba automáticamente que `areaId`, `puestoId`, `rolId` o `permisoId` apunten a documentos existentes.
- Las relaciones muchos a muchos y las reglas de aprobación requieren lógica adicional en la aplicación.
- Sin índices únicos, la aplicación debe comprobar la unicidad de valores de negocio como email, legajo y códigos.
- Los informes que atraviesan empleados, puestos, roles, permisos y aplicaciones requieren consultas con agregaciones o varias lecturas.

### Oracle relacional

**Ventajas**

- Las relaciones muchos a muchos quedan expresadas con tablas intermedias y claves foráneas.
- Las restricciones declarativas ayudan a impedir referencias inválidas y valores fuera de dominio.
- Las consultas y reportes pueden combinar entidades mediante `JOIN`.

**Desventajas**

- Para mostrar una solicitud con sus aprobaciones y responsables hay que consultar varias tablas relacionadas.
- Cada cambio de estructura exige modificar las tablas y sus restricciones asociadas.

## Conclusión para el proyecto

MongoDB es defendible para esta implementación si se prioriza el flujo centrado en solicitudes y la lectura de cada pedido junto con sus aprobaciones. El modelo usa documentos embebidos donde los datos se consultan juntos y referencias para roles, empleados y otras entidades compartidas.

El paradigma relacional también es una opción especialmente adecuada para IAM porque empleados, puestos, roles, aplicaciones y permisos tienen relaciones compartidas y reglas de integridad importantes. Por eso, la comparación no concluye que MongoDB sea siempre superior: muestra que MongoDB simplifica el agregado solicitud-aprobaciones, mientras Oracle expresa con más fuerza las relaciones y restricciones del catálogo de accesos.

## Fuentes técnicas

- MongoDB recomienda considerar referencias para relaciones muchos a muchos complejas y entidades que se consultan por separado: [Reference Data in Your MongoDB Schema](https://www.mongodb.com/docs/manual/data-modeling/referencing/).
- MongoDB describe el uso de documentos embebidos para reunir datos relacionados que se consultan juntos: [Model One-to-Many Relationships with Embedded Documents](https://www.mongodb.com/docs/manual/tutorial/model-embedded-one-to-many-relationships-between-documents/).
- MongoDB permite validar estructura y tipos con `$jsonSchema`: [Specify JSON Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/).
- Las escrituras MongoDB son atómicas a nivel de documento; las transacciones entre documentos se evalúan para operaciones que necesitan atomicidad en varias colecciones: [Atomicity and Transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/).
