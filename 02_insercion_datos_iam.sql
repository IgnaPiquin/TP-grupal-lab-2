BEGIN
    -- 1. Catálogos base (Áreas y Puestos)
    INSERT INTO area (area_id, nombre, descripcion) VALUES (1, 'Tecnología', 'Desarrollo y soporte de sistemas');
    INSERT INTO area (area_id, nombre, descripcion) VALUES (2, 'Recursos Humanos', 'Administración del personal');

    INSERT INTO puesto (puesto_id, nombre, descripcion) VALUES (1, 'Analista de sistemas', 'Puesto del área de tecnología');
    INSERT INTO puesto (puesto_id, nombre, descripcion) VALUES (2, 'Jefe de Recursos Humanos', 'Puesto habilitado para aprobar accesos de RRHH');

    -- 2. Aplicaciones y Permisos
    INSERT INTO aplicacion (aplicacion_id, codigo, nombre, descripcion) VALUES (1, 'RRHH', 'Gestión de personal', 'Aplicación de recursos humanos');
    INSERT INTO aplicacion (aplicacion_id, codigo, nombre, descripcion) VALUES (2, 'FIN', 'Reportes financieros', 'Aplicación de consulta financiera');

    INSERT INTO permiso (permiso_id, aplicacion_id, codigo, nombre) VALUES (1, 1, 'PERSONAL_LECTURA', 'Consultar personal');
    INSERT INTO permiso (permiso_id, aplicacion_id, codigo, nombre) VALUES (2, 1, 'SOLICITUD_APROBAR', 'Aprobar solicitudes');
    INSERT INTO permiso (permiso_id, aplicacion_id, codigo, nombre) VALUES (3, 2, 'REPORTES_LECTURA', 'Consultar reportes financieros');

    -- 3. Roles y Matriz de Permisos
    INSERT INTO rol (rol_id, codigo, nombre) VALUES (1, 'ANALISTA_TI', 'Analista de tecnología');
    INSERT INTO rol (rol_id, codigo, nombre) VALUES (2, 'APROBADOR_RRHH', 'Aprobador de Recursos Humanos');
    INSERT INTO rol (rol_id, codigo, nombre) VALUES (3, 'AUDITOR', 'Auditor');
    INSERT INTO rol (rol_id, codigo, nombre) VALUES (4, 'CONSULTA_FINANZAS', 'Consulta de finanzas');

    INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (1, 1);
    INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (2, 2);
    INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (3, 1);
    INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (3, 3);
    INSERT INTO rol_permiso (rol_id, permiso_id) VALUES (4, 3);

    -- 4. Asignación de Roles Automáticos por Puesto
    INSERT INTO puesto_rol (puesto_id, rol_id, fecha_desde) VALUES (1, 1, SYSDATE);
    INSERT INTO puesto_rol (puesto_id, rol_id, fecha_desde) VALUES (2, 2, SYSDATE);

    -- 5. Empleados (Lucía y Martín)
    INSERT INTO empleado (empleado_id, legajo, nombre, apellido, email, area_id, puesto_id) 
    VALUES (1, '1001', 'Lucía', 'Pérez', 'lucia.perez@ejemplo.com', 1, 1);

    INSERT INTO empleado (empleado_id, legajo, nombre, apellido, email, area_id, puesto_id) 
    VALUES (2, '2001', 'Martín', 'Gómez', 'martin.gomez@ejemplo.com', 2, 2);

    -- 6. Solicitudes de permisos
    INSERT INTO solicitud (solicitud_id, solicitante_id, rol_solicitado_id, tipo, estado, motivo)
    VALUES (1, 1, 3, 'ALTA', 'EN_APROBACION', 'Necesito revisar reportes durante el control interno.');

    INSERT INTO aprobacion (aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, estado)
    VALUES (1, 1, 1, 2, 'PENDIENTE');

    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (1, 1, 'SOLICITUD', 1, 'SOLICITUD_CREADA', 'Alta solicitada para rol Auditor');

    INSERT INTO solicitud (solicitud_id, solicitante_id, rol_solicitado_id, tipo, estado, motivo)
    VALUES (2, 1, 4, 'ALTA', 'EN_APROBACION', 'Necesito consultar los reportes financieros del proyecto.');

    INSERT INTO aprobacion (aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, estado)
    VALUES (2, 2, 1, 2, 'PENDIENTE');

    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (1, 2, 'SOLICITUD', 2, 'SOLICITUD_CREADA', 'Alta solicitada para rol Consulta de finanzas');

    INSERT INTO solicitud (solicitud_id, solicitante_id, rol_solicitado_id, rol_anterior_id, tipo, estado, motivo, fecha_cierre)
    VALUES (3, 1, 4, 1, 'MODIFICACION', 'APROBADA', 'Actualización de perfil por rotación interna de tareas.', SYSTIMESTAMP);

    INSERT INTO aprobacion (aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, aprobador_id, estado, fecha_decision, comentario)
    VALUES (3, 3, 1, 2, 2, 'APROBADA', SYSTIMESTAMP, 'Aprobado por jefatura de RRHH.');

    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (1, 3, 'SOLICITUD', 3, 'SOLICITUD_MODIFICACION', 'Solicitud de modificación de rol procesada y aprobada.');

    INSERT INTO solicitud (solicitud_id, solicitante_id, rol_solicitado_id, rol_anterior_id, tipo, estado, motivo, fecha_cierre)
    VALUES (4, 2, 2, NULL, 'BAJA', 'RECHAZADA', 'Solicitud de cese de rol rechazada por control interno.', SYSTIMESTAMP);

    INSERT INTO aprobacion (aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, aprobador_id, estado, fecha_decision, comentario)
    VALUES (4, 4, 1, 2, 2, 'RECHAZADA', SYSTIMESTAMP, 'Se requiere mantener el rol activo por funciones vigentes.');

    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (2, 4, 'SOLICITUD', 4, 'SOLICITUD_RECHAZADA', 'Solicitud de baja rechazada por el aprobador.');

    -- 7. Asignaciones Directas Iniciales
    INSERT INTO empleado_rol (empleado_id, rol_id, origen, solicitud_origen_id, asignado_por_id, motivo)
    VALUES (2, 4, 'DIRECTO', NULL, 2, 'Asignación directa por necesidad operativa excepcional.');

    -- 8. Solicitud pendiente para probar el procedimiento del paquete
    INSERT INTO solicitud (solicitud_id, solicitante_id, rol_solicitado_id, tipo, estado, motivo)
    VALUES (5, 1, 4, 'ALTA', 'EN_APROBACION', 'Alta de rol para probar el paquete de gestión IAM.');

    INSERT INTO aprobacion (aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, estado)
    VALUES (5, 5, 1, 2, 'PENDIENTE');

    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (1, 5, 'SOLICITUD', 5, 'SOLICITUD_CREADA', 'Alta pendiente para demostrar el paquete PL/SQL.');

    COMMIT;
END;
