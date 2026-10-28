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
/

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
/

-- 3. Procedimiento almacenado para aprobar una solicitud con manejo de errores y excepciones
CREATE OR REPLACE PROCEDURE pr_aprobar_solicitud (
    p_solicitud_id   IN NUMBER,
    p_aprobador_id   IN NUMBER,
    p_comentario     IN VARCHAR2
) AS
    -- Declaración de excepciones personalizadas / no predefinidas
    e_solicitud_no_encontrada EXCEPTION;
    v_contador NUMBER;
    v_empleado_id NUMBER;
    v_rol_id NUMBER;
BEGIN
    -- Validar si la solicitud pendiente existe
    SELECT COUNT(*), MAX(solicitante_id), MAX(rol_solicitado_id)
    INTO v_contador, v_empleado_id, v_rol_id
    FROM solicitud
    WHERE solicitud_id = p_solicitud_id AND estado = 'PENDIENTE';

    IF v_contador = 0 THEN
        RAISE e_solicitud_no_encontrada;
    END IF;

    -- 1. Actualizar la tabla de aprobación
    UPDATE aprobacion
    SET estado = 'APROBADA', 
        aprobador_id = p_aprobador_id, 
        fecha_decision = SYSTIMESTAMP, 
        comentario = p_comentario
    WHERE solicitud_id = p_solicitud_id AND numero_paso = 1;

    -- 2. Actualizar el estado de la solicitud principal
    UPDATE solicitud 
    SET estado = 'APROBADA', 
        fecha_cierre = SYSTIMESTAMP 
    WHERE solicitud_id = p_solicitud_id;

    -- 3. Otorgar formalmente el rol al empleado en empleado_rol
    INSERT INTO empleado_rol (empleado_id, rol_id, origen, solicitud_origen_id, asignado_por_id, motivo)
    VALUES (v_empleado_id, v_rol_id, 'SOLICITUD', p_solicitud_id, p_aprobador_id, p_comentario);

    -- 4. Registrar en la auditoría
    INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
    VALUES (p_aprobador_id, p_solicitud_id, 'SOLICITUD', p_solicitud_id, 'SOLICITUD_APROBADA_PROC', 'Aprobada mediante procedimiento PL/SQL.');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Solicitud ' || p_solicitud_id || ' aprobada exitosamente.');

EXCEPTION
    WHEN e_solicitud_no_encontrada THEN
        -- Uso de error de aplicación personalizado (Unidad 4)
        RAISE_APPLICATION_ERROR(-20001, 'Error: La solicitud ID ' || p_solicitud_id || ' no existe o ya no se encuentra pendiente.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20002, 'Error inesperado al procesar la solicitud: ' || SQLERRM);
END pr_aprobar_solicitud;
/

-- 3.1. Bloque anónimo para probar el procedimiento anterior (con manejo de excepciones y DBMS_OUTPUT)
SET SERVEROUTPUT ON;

BEGIN
    -- Probamos aprobar la solicitud número 2 (que quedó pendiente en las inserciones)
    pr_aprobar_solicitud(
        p_solicitud_id => 2, 
        p_aprobador_id => 2, 
        p_comentario   => 'Aprobado correctamente mediante procedimiento.'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Captura el error lanzado por RAISE_APPLICATION_ERROR
        DBMS_OUTPUT.PUT_LINE('Se atrapó una excepción: ' || SQLERRM);
END;
/

-- 4.Cursor explícito para listar empleados y la cantidad de roles asignados
SET SERVEROUTPUT ON;

DECLARE
    -- Declaración de un cursor explícito que calcula los roles activos por empleado
    CURSOR c_resumen_roles IS
        SELECT e.legajo, e.nombre || ' ' || e.apellido AS empleado, COUNT(er.rol_id) AS total_roles
        FROM empleado e
        LEFT JOIN empleado_rol er ON e.empleado_id = er.empleado_id AND (er.fecha_fin IS NULL OR er.fecha_fin >= SYSDATE)
        GROUP BY e.legajo, e.nombre, e.apellido;
BEGIN
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
    DBMS_OUTPUT.PUT_LINE('       RESUMEN DE ROLES ACTIVOS POR EMPLEADO      ');
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');

    -- Recorrido del cursor utilizando un FOR LOOP (Unidad 3)
    FOR r IN c_resumen_roles LOOP
        DBMS_OUTPUT.PUT_LINE('Legajo: ' || r.legajo || ' | Empleado: ' || r.empleado || ' | Roles Activos: ' || r.total_roles);
    END LOOP;
    
    DBMS_OUTPUT.PUT_LINE('--------------------------------------------------');
END;
/

-- 5.Función: Validar Permisos de un Empleado
CREATE OR REPLACE FUNCTION fu_empleado_tiene_permiso (
    p_empleado_id    IN NUMBER,
    p_codigo_permiso IN VARCHAR2
) RETURN CHAR IS
    v_resultado NUMBER := 0;
    v_tiene     CHAR(1) := 'N';
BEGIN
    -- Busca en permisos heredados por puesto o asignados directamente
    SELECT COUNT(*)
    INTO v_resultado
    FROM (
        -- Permisos por Puesto
        SELECT p.codigo
        FROM empleado e
        JOIN puesto_rol pr ON e.puesto_id = pr.puesto_id
        JOIN rol_permiso rp ON pr.rol_id = rp.rol_id
        JOIN permiso p ON rp.permiso_id = p.permiso_id
        WHERE e.empleado_id = p_empleado_id 
          AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta >= SYSDATE)
        
        UNION
        
        -- Permisos Directos / por Solicitud
        SELECT p.codigo
        FROM empleado e
        JOIN empleado_rol er ON e.empleado_id = er.empleado_id
        JOIN rol_permiso rp ON er.rol_id = rp.rol_id
        JOIN permiso p ON rp.permiso_id = p.permiso_id
        WHERE e.empleado_id = p_empleado_id 
          AND (er.fecha_fin IS NULL OR er.fecha_fin >= SYSDATE)
    )
    WHERE codigo = p_codigo_permiso;

    IF v_resultado > 0 THEN
        v_tiene := 'S';
    ELSE
        v_tiene := 'N';
    END IF;

    RETURN v_tiene;
END fu_empleado_tiene_permiso;
/

-- 5.1 Bloque anónimo para probar la función de validación de permisos
SET SERVEROUTPUT ON;
BEGIN
    IF fu_empleado_tiene_permiso(1, 'REPORTES_LECTURA') = 'S' THEN
        DBMS_OUTPUT.PUT_LINE('El empleado 1 TIENE acceso al reporte financiero.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('El empleado 1 NO TIENE acceso al reporte financiero.');
    END IF;
END;
/

-- 6. Paquete PL/SQL pkg_gestion_iam
-- 6.1 Declaración del paquete
CREATE OR REPLACE PACKAGE pkg_gestion_iam AS
    -- Procedimiento público para aprobar solicitudes
    PROCEDURE pr_aprobar_solicitud (
        p_solicitud_id   IN NUMBER,
        p_aprobador_id   IN NUMBER,
        p_comentario     IN VARCHAR2
    );

    -- Función pública para validar permisos
    FUNCTION fu_empleado_tiene_permiso (
        p_empleado_id    IN NUMBER,
        p_codigo_permiso IN VARCHAR2
    ) RETURN CHAR;
END pkg_gestion_iam;
/

CREATE OR REPLACE PACKAGE pkg_gestion_iam AS
    -- Procedimiento público para aprobar solicitudes
    PROCEDURE pr_aprobar_solicitud (
        p_solicitud_id   IN NUMBER,
        p_aprobador_id   IN NUMBER,
        p_comentario     IN VARCHAR2
    );

    -- Función pública para validar permisos
    FUNCTION fu_empleado_tiene_permiso (
        p_empleado_id    IN NUMBER,
        p_codigo_permiso IN VARCHAR2
    ) RETURN CHAR;
END pkg_gestion_iam;
/

-- 6.2 Cuerpo del paquete
CREATE OR REPLACE PACKAGE BODY pkg_gestion_iam AS

    PROCEDURE pr_aprobar_solicitud (
        p_solicitud_id   IN NUMBER,
        p_aprobador_id   IN NUMBER,
        p_comentario     IN VARCHAR2
    ) AS
        e_solicitud_no_encontrada EXCEPTION;
        v_contador NUMBER;
        v_empleado_id NUMBER;
        v_rol_id NUMBER;
    BEGIN
        SELECT COUNT(*), MAX(solicitante_id), MAX(rol_solicitado_id)
        INTO v_contador, v_empleado_id, v_rol_id
        FROM solicitud
        WHERE solicitud_id = p_solicitud_id AND estado = 'PENDIENTE';

        IF v_contador = 0 THEN
            RAISE e_solicitud_no_encontrada;
        END IF;

        UPDATE aprobacion
        SET estado = 'APROBADA', 
            aprobador_id = p_aprobador_id, 
            fecha_decision = SYSTIMESTAMP, 
            comentario = p_comentario
        WHERE solicitud_id = p_solicitud_id AND numero_paso = 1;

        UPDATE solicitud 
        SET estado = 'APROBADA', 
            fecha_cierre = SYSTIMESTAMP 
        WHERE solicitud_id = p_solicitud_id;

        INSERT INTO empleado_rol (empleado_id, rol_id, origen, solicitud_origen_id, asignado_por_id, motivo)
        VALUES (v_empleado_id, v_rol_id, 'SOLICITUD', p_solicitud_id, p_aprobador_id, p_comentario);

        INSERT INTO log_auditoria (actor_id, solicitud_id, objeto_tipo, id_registro, accion, detalle)
        VALUES (p_aprobador_id, p_solicitud_id, 'SOLICITUD', p_solicitud_id, 'SOLICITUD_APROBADA_PKG', 'Aprobada mediante paquete PL/SQL.');

        COMMIT;
    EXCEPTION
        WHEN e_solicitud_no_encontrada THEN
            RAISE_APPLICATION_ERROR(-20001, 'Error: La solicitud ID ' || p_solicitud_id || ' no existe o no está pendiente.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20002, 'Error inesperado: ' || SQLERRM);
    END pr_aprobar_solicitud;

    FUNCTION fu_empleado_tiene_permiso (
        p_empleado_id    IN NUMBER,
        p_codigo_permiso IN VARCHAR2
    ) RETURN CHAR IS
        v_resultado NUMBER := 0;
        v_tiene     CHAR(1) := 'N';
    BEGIN
        SELECT COUNT(*)
        INTO v_resultado
        FROM (
            SELECT p.codigo FROM empleado e JOIN puesto_rol pr ON e.puesto_id = pr.puesto_id JOIN rol_permiso rp ON pr.rol_id = rp.rol_id JOIN permiso p ON rp.permiso_id = p.permiso_id WHERE e.empleado_id = p_empleado_id AND (pr.fecha_hasta IS NULL OR pr.fecha_hasta >= SYSDATE)
            UNION
            SELECT p.codigo FROM empleado e JOIN empleado_rol er ON e.empleado_id = er.empleado_id JOIN rol_permiso rp ON er.rol_id = rp.rol_id JOIN permiso p ON rp.permiso_id = p.permiso_id WHERE e.empleado_id = p_empleado_id AND (er.fecha_fin IS NULL OR er.fecha_fin >= SYSDATE)
        )
        WHERE codigo = p_codigo_permiso;

        IF v_resultado > 0 THEN v_tiene := 'S'; END IF;
        RETURN v_tiene;
    END fu_empleado_tiene_permiso;

END pkg_gestion_iam;
/

-- 6.3 Bloque anónimo para probar el paquete
SET SERVEROUTPUT ON;
BEGIN
    -- Llamada al procedimiento dentro del paquete
    pkg_gestion_iam.pr_aprobar_solicitud(1, 2, 'Aprobado vía package.');
    
    -- Llamada a la función dentro del paquete
    IF pkg_gestion_iam.fu_empleado_tiene_permiso(1, 'PERSONAL_LECTURA') = 'S' THEN
        DBMS_OUTPUT.PUT_LINE('Acceso permitido.');
    END IF;
END;
/