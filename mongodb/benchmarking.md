# Benchmarking: MongoDB documental y Oracle relacional

## Alcance

La consigna pide comparar paradigmas. Este análisis contrasta el modelo documental de MongoDB con el modelo relacional de Oracle del archivo `../01_modelo_iam.sql`, aplicado al caso de gestión de identidades y accesos.

La aclaración de la cátedra indica priorizar documentos embebidos y evitar completar entidades consultando otras colecciones por identificadores. Por eso, la versión MongoDB usa dos agregados autocontenidos: `empleados` y `solicitudes`. No se presentan tiempos de rendimiento: Oracle tiene el esquema, pero todavía no se ejecutó allí una carga equivalente de datos y operaciones.

## Modelo MongoDB alineado con la cátedra

- En `empleados`, el área, el puesto, los roles del puesto, las aplicaciones y sus permisos están embebidos. Una lectura del empleado permite calcular sus accesos sin consultar colecciones adicionales.
- En `solicitudes`, se embeben los datos del solicitante, el rol solicitado con sus aplicaciones y permisos, la persona responsable de aprobar, los pasos de aprobación y los eventos de auditoría.
- Las entidades compartidas se copian como snapshots dentro de los agregados donde se necesitan. Las consultas no usan referencias por `*_id` ni `$lookup` para obtener información relacionada.
- `_id` identifica el documento raíz. El `legajo` embebido identifica a la persona en el dominio; al aprobar una solicitud se utiliza para actualizar su agregado, sin buscar allí datos para completar la solicitud.

## Resultado de la ejecución funcional

Se ejecutaron los tres scripts en un servidor local MongoDB 8.3.7, con `mongosh` 2.9.2 en Windows x64 y la base `gestor_accesos_iam_embebido`.

| Operación | Resultado observado |
|---|---|
| Creación de estructura | Se crearon las colecciones `empleados` y `solicitudes`, con validadores `$jsonSchema`. |
| Carga demo | 2 empleados con área, puesto y roles embebidos; permisos y aplicaciones están anidados dentro de cada rol. |
| Solicitudes | Se almacenaron 2 solicitudes autocontenidas, con datos del solicitante y aprobador incluidos. |
| Aprobación | `SOL-DEMO-001` fue aprobada por Martín Gómez, cuyo rol aprobador está embebido en el paso. El rol solicitado se agregó a los accesos directos de Lucía Pérez. |
| Consulta de pendientes | `SOL-DEMO-002` quedó en estado `EN_APROBACION` y el resultado contiene solicitante, rol y responsable. |
| Consulta de accesos | La agregación sobre el documento de Lucía devolvió 3 permisos efectivos, incluidos los heredados del puesto y los del rol aprobado. |
| Auditoría | Hay 3 eventos embebidos: creación de las dos solicitudes y aprobación de la primera. |

Esta ejecución verifica que la estructura y las operaciones funcionan sin enriquecer documentos mediante búsquedas en otras colecciones. No mide latencia ni permite concluir qué motor es más rápido.

## Comparación

| Criterio | MongoDB documental | Oracle relacional | Efecto para el caso IAM |
|---|---|---|---|
| Organización | `empleados` guarda juntos el perfil y los accesos; `solicitudes` guarda juntos su solicitante, rol, aprobaciones y eventos. | Las entidades se distribuyen en tablas relacionadas por claves. | MongoDB consulta cada agregado sin reconstruir sus datos con uniones. Oracle mantiene cada entidad compartida en un único lugar. |
| Área y puesto | Se embeben dentro del documento del empleado. | `empleado` referencia `area` y `puesto`. | El perfil MongoDB está disponible con una lectura; Oracle evita repetir datos organizacionales. |
| Roles, aplicaciones y permisos | Aplicaciones y permisos se anidan en el rol, que se copia en el agregado del empleado o la solicitud que lo necesita. | Se representan con tablas y relaciones como `puesto_rol` y `rol_permiso`. | MongoDB favorece consultas completas del agregado; Oracle facilita administrar un catálogo central sin copias divergentes. |
| Aprobaciones y auditoría | Se embeben dentro de la solicitud y se consultan junto con sus datos. | `aprobacion` y `log_auditoria` son tablas separadas vinculadas a `solicitud`. | El flujo completo se obtiene desde un documento MongoDB; Oracle permite consultar eventos y aprobaciones por separado. |
| Integridad | `$jsonSchema` valida tipos y estructura. Las reglas de negocio y consistencia entre snapshots dependen de las operaciones de la aplicación. | Claves primarias, foráneas y restricciones controlan relaciones y valores. | Oracle ofrece más integridad declarativa; MongoDB evita referencias colgantes en estos agregados al guardar subdocumentos completos. |
| Actualización | Un cambio de catálogo puede requerir actualizar snapshots en varios agregados. | Un cambio en la entidad compartida se realiza en una fila central. | MongoDB simplifica las lecturas a costa de más duplicación y trabajo de actualización. |

## Ventajas y desventajas

### MongoDB

**Ventajas**

- Los accesos efectivos del empleado se calculan con los datos embebidos en su agregado.
- Una solicitud contiene los datos necesarios para revisar quién la inició, qué acceso pide y quién la aprobó.
- Las aprobaciones y la auditoría de una solicitud se consultan juntas, sin `$lookup`.

**Desventajas**

- Los roles, aplicaciones y permisos aparecen repetidos en los agregados donde se necesitan.
- Al cambiar la descripción o los permisos de un rol, hay que decidir cómo actualizar los snapshots existentes.
- Las relaciones compartidas y reglas que Oracle expresa con claves foráneas deben mantenerse mediante la aplicación y los validadores.

### Oracle relacional

**Ventajas**

- Los catálogos compartidos se almacenan una sola vez y se vinculan con claves foráneas.
- Las restricciones declarativas ayudan a impedir relaciones inválidas.
- Los `JOIN` permiten obtener informes transversales y consultar las entidades relacionadas.

**Desventajas**

- Para mostrar una solicitud completa hay que combinar varias tablas.
- El modelo tiene más tablas y relaciones que mantener para este flujo.

## Conclusión

El modelo MongoDB actual sigue la pauta de la cátedra: cada consulta funcional recibe un agregado con los datos relacionados que necesita, y no se usan identificadores para ir a buscar detalles a otras colecciones. Los snapshots reducen lecturas y a la vez duplican información.

Oracle sigue siendo una opción muy adecuada para IAM porque empleados, roles y permisos son entidades compartidas con reglas de integridad. Para una comparación de rendimiento todavía falta implementar y ejecutar en Oracle las mismas operaciones y el mismo volumen de datos. La tabla anterior es una comparación de diseño, no una medición de velocidad.

## Fuentes técnicas

- MongoDB explica cuándo conviene embeber datos relacionados que se consultan juntos: [Model One-to-Many Relationships with Embedded Documents](https://www.mongodb.com/docs/manual/tutorial/model-embedded-one-to-many-relationships-between-documents/).
- MongoDB explica cuándo considerar referencias para relaciones muchos a muchos y datos consultados por separado: [Reference Data in Your MongoDB Schema](https://www.mongodb.com/docs/manual/data-modeling/referencing/).
- MongoDB permite validar estructura y tipos con `$jsonSchema`: [Specify JSON Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/).
