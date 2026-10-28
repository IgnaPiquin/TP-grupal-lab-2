-- Datos sintéticos para comparar Oracle con MongoDB.
-- Ejecutar una sola vez luego de 01_modelo_iam.sql y 02_insercion_datos_iam.sql.
-- Los identificadores 1 y 2 quedan reservados para los registros de demostración.

INSERT INTO empleado (
    empleado_id, legajo, nombre, apellido, email,
    area_id, puesto_id, fecha_alta, activo
)
SELECT
    10000 + n,
    'BEN-' || LPAD(n, 5, '0'),
    'Empleado',
    'Benchmark ' || LPAD(n, 5, '0'),
    'benchmark' || LPAD(n, 5, '0') || '@ejemplo.com',
    CASE WHEN MOD(n, 2) = 0 THEN 1 ELSE 2 END,
    CASE WHEN MOD(n, 2) = 0 THEN 1 ELSE 2 END,
    DATE '2026-10-01',
    'S'
FROM (SELECT LEVEL AS n FROM dual CONNECT BY LEVEL <= 5000);

INSERT INTO empleado_rol (
    empleado_id, rol_id, origen, asignado_por_id, motivo, fecha_inicio
)
SELECT
    10000 + n,
    CASE WHEN MOD(n, 2) = 0 THEN 3 ELSE 4 END,
    'DIRECTO',
    2,
    'Asignación sintética para benchmark',
    DATE '2026-10-01'
FROM (SELECT LEVEL AS n FROM dual CONNECT BY LEVEL <= 5000);

INSERT INTO solicitud (
    solicitud_id, solicitante_id, rol_solicitado_id, tipo, estado, motivo, fecha_creacion
)
SELECT
    20000 + n,
    10000 + n,
    CASE WHEN MOD(n, 2) = 0 THEN 3 ELSE 4 END,
    'ALTA',
    'EN_APROBACION',
    'Solicitud sintética para benchmark',
    TIMESTAMP '2026-10-01 12:00:00'
FROM (SELECT LEVEL AS n FROM dual CONNECT BY LEVEL <= 5000);

INSERT INTO aprobacion (
    aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, estado
)
SELECT
    20000 + n,
    20000 + n,
    1,
    2,
    'PENDIENTE'
FROM (SELECT LEVEL AS n FROM dual CONNECT BY LEVEL <= 5000);

COMMIT;
