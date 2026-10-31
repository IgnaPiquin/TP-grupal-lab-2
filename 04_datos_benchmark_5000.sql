-- Datos sintéticos para comparar Oracle con MongoDB.
-- Ejecutar una sola vez luego de 01_modelo_iam.sql y 02_insercion_datos_iam.sql.
-- Los identificadores 1 y 2 quedan reservados para los registros de demostración.
-- El ciclo FOR genera un empleado y su solicitud con aprobación por cada valor de n.
-- El IF alterna entre dos perfiles de prueba, sin usar CASE ni MOD.

DECLARE
    v_area_id NUMBER := 2;
    v_rol_id  NUMBER := 4;
BEGIN
    FOR n IN 1..5000 LOOP
        INSERT INTO empleado (
            empleado_id, legajo, nombre, apellido, email,
            area_id, puesto_id, fecha_alta, activo
        ) VALUES (
            10000 + n,
            'BEN-' || n,
            'Empleado',
            'Benchmark ' || n,
            'benchmark' || n || '@ejemplo.com',
            v_area_id,
            v_area_id,
            DATE '2026-10-01',
            'S'
        );

        INSERT INTO empleado_rol (
            empleado_id, rol_id, origen, asignado_por_id, motivo, fecha_inicio
        ) VALUES (
            10000 + n,
            v_rol_id,
            'DIRECTO',
            2,
            'Asignación sintética para benchmark',
            DATE '2026-10-01'
        );

        INSERT INTO solicitud (
            solicitud_id, solicitante_id, rol_solicitado_id, tipo, estado, motivo, fecha_creacion
        ) VALUES (
            20000 + n,
            10000 + n,
            v_rol_id,
            'ALTA',
            'EN_APROBACION',
            'Solicitud sintética para benchmark',
            TIMESTAMP '2026-10-01 12:00:00'
        );

        INSERT INTO aprobacion (
            aprobacion_id, solicitud_id, numero_paso, rol_aprobador_id, estado
        ) VALUES (
            20000 + n,
            20000 + n,
            1,
            2,
            'PENDIENTE'
        );

        IF v_area_id = 2 THEN
            v_area_id := 1;
            v_rol_id := 3;
        ELSE
            v_area_id := 2;
            v_rol_id := 4;
        END IF;
    END LOOP;

    COMMIT;
END;
/
