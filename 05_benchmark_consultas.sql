-- Consultas de lectura para el benchmark contra mongodb/05_benchmark_consultas.js.
-- Cada sentencia devuelve una cardinalidad, lo que obliga a recorrer el resultado completo.

-- Accesos efectivos de 5.000 empleados: roles heredados del puesto y directos.
SELECT COUNT(*) AS filas
FROM (
    SELECT e.empleado_id, r.rol_id, a.aplicacion_id, p.permiso_id
    FROM empleado e
    JOIN puesto_rol pr ON pr.puesto_id = e.puesto_id
    JOIN rol r ON r.rol_id = pr.rol_id
    JOIN rol_permiso rp ON rp.rol_id = r.rol_id
    JOIN permiso p ON p.permiso_id = rp.permiso_id
    JOIN aplicacion a ON a.aplicacion_id = p.aplicacion_id
    WHERE e.empleado_id BETWEEN 10001 AND 15000
      AND e.activo = 'S'
      AND r.activo = 'S'
      AND p.activo = 'S'
      AND a.activo = 'S'
      AND pr.fecha_desde <= SYSDATE
      AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta >= SYSDATE)

    UNION

    SELECT e.empleado_id, r.rol_id, a.aplicacion_id, p.permiso_id
    FROM empleado e
    JOIN empleado_rol er ON er.empleado_id = e.empleado_id
    JOIN rol r ON r.rol_id = er.rol_id
    JOIN rol_permiso rp ON rp.rol_id = r.rol_id
    JOIN permiso p ON p.permiso_id = rp.permiso_id
    JOIN aplicacion a ON a.aplicacion_id = p.aplicacion_id
    WHERE e.empleado_id BETWEEN 10001 AND 15000
      AND e.activo = 'S'
      AND r.activo = 'S'
      AND p.activo = 'S'
      AND a.activo = 'S'
      AND er.fecha_inicio <= SYSDATE
      AND (er.fecha_fin IS NULL OR er.fecha_fin >= SYSDATE)
);

-- Detalle de permisos de las aprobaciones pendientes de 5.000 solicitudes.
SELECT COUNT(*) AS filas
FROM solicitud s
JOIN empleado e ON e.empleado_id = s.solicitante_id
JOIN rol rs ON rs.rol_id = s.rol_solicitado_id
JOIN aprobacion ap ON ap.solicitud_id = s.solicitud_id
JOIN rol ra ON ra.rol_id = ap.rol_aprobador_id
JOIN rol_permiso rp ON rp.rol_id = rs.rol_id
JOIN permiso p ON p.permiso_id = rp.permiso_id
JOIN aplicacion a ON a.aplicacion_id = p.aplicacion_id
WHERE s.solicitud_id BETWEEN 20001 AND 25000
  AND s.estado = 'EN_APROBACION'
  AND ap.estado = 'PENDIENTE'
  AND e.activo = 'S'
  AND rs.activo = 'S'
  AND ra.activo = 'S'
  AND p.activo = 'S'
  AND a.activo = 'S';
