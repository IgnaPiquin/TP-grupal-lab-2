-- 1. Transacción de Aprobación Atómica
BEGIN
    UPDATE aprobacion
    SET estado = 'APROBADA', aprobador_id = 2, fecha_decision = SYSTIMESTAMP, comentario = 'Aprobado para la tarea de auditoría.'
    WHERE solicitud_id = 1 AND numero_paso = 1;

    UPDATE solicitud 
    SET estado = 'APROBADA', fecha_cierre = SYSTIMESTAMP 
    WHERE solicitud_id = 1;

    INSERT INTO empleado_rol (empleado_id, rol_id, origen, solicitud_origen_id, asignado_por_id, motivo)
    VALUES (1, 3, 'SOLICITUD', 1, 2, 'Solicitud aprobada: Necesito revisar reportes durante el control interno.');

    INSERT INTO log_auditoria (actor_id, solicitud_id, aprobacion_id, objeto_tipo, id_registro, accion)
    VALUES (2, 1, 1, 'SOLICITUD', 1, 'SOLICITUD_APROBADA');

    COMMIT;
END;


-- 2. Consulta de permisos efectivos consolidados (UNION de heredados + directos)
SELECT e.nombre || ' ' || e.apellido AS empleado, r.nombre AS rol, a.nombre AS aplicacion, p.nombre AS permiso
FROM empleado e
JOIN puesto_rol pr ON e.puesto_id = pr.puesto_id
JOIN rol r ON pr.rol_id = r.rol_id
JOIN rol_permiso rp ON r.rol_id = rp.rol_id
JOIN permiso p ON rp.permiso_id = p.permiso_id
JOIN aplicacion a ON p.aplicacion_id = a.aplicacion_id
WHERE e.empleado_id = 1 AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta >= SYSDATE)

UNION

SELECT e.nombre || ' ' || e.apellido AS empleado, r.nombre AS rol, a.nombre AS aplicacion, p.nombre AS permiso
FROM empleado e
JOIN empleado_rol er ON e.empleado_id = er.empleado_id
JOIN rol r ON er.rol_id = r.rol_id
JOIN rol_permiso rp ON r.rol_id = rp.rol_id
JOIN permiso p ON rp.permiso_id = p.permiso_id
JOIN aplicacion a ON p.aplicacion_id = a.aplicacion_id
WHERE e.empleado_id = 1 AND (er.fecha_fin IS NULL OR er.fecha_fin >= SYSDATE);