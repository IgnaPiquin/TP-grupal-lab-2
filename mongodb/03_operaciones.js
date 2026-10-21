// Ejemplos de alta de solicitud, aprobación, asignación y consultas.
// Ejecutar después de 01_crear_estructura.js y 02_cargar_datos_demo.js.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam");

  function requerido(coleccion, id) {
    const documento = iam.getCollection(coleccion).findOne({ _id: id });
    if (!documento) {
      throw new Error(`No existe ${coleccion} con _id=${id}. Cargá primero los datos de ejemplo.`);
    }
    return documento;
  }

  function crearSolicitudSiFalta(solicitud) {
    const solicitudes = iam.getCollection("solicitudes");
    if (solicitudes.findOne({ _id: solicitud._id })) {
      print(`La solicitud ${solicitud._id} ya existe; se conserva su estado.`);
      return;
    }

    solicitudes.insertOne(solicitud);
    iam.auditoria.updateOne(
      { _id: `AUD-${solicitud._id}-CREADA` },
      {
        $setOnInsert: {
          _id: `AUD-${solicitud._id}-CREADA`,
          actorId: solicitud.solicitanteId,
          solicitudId: solicitud._id,
          objetoTipo: "SOLICITUD",
          objetoId: solicitud._id,
          accion: "SOLICITUD_CREADA",
          fechaEvento: solicitud.fechaCreacion,
          detalle: {
            tipo: solicitud.tipo,
            rolSolicitadoId: solicitud.rolSolicitadoId,
            motivo: solicitud.motivo
          }
        }
      },
      { upsert: true }
    );
    print(`Solicitud creada: ${solicitud._id}`);
  }

  function rolesEfectivos(empleado) {
    const ids = [];
    const puesto = iam.puestos.findOne({ _id: empleado.puestoId });
    (puesto?.roles ?? []).forEach((rolId) => {
      if (!ids.includes(rolId)) ids.push(rolId);
    });

    const ahora = new Date();
    (empleado.rolesDirectos ?? []).forEach((asignacion) => {
      const yaInicio = asignacion.fechaInicio <= ahora;
      const sigueVigente = asignacion.fechaFin === null || asignacion.fechaFin > ahora;
      if (yaInicio && sigueVigente && !ids.includes(asignacion.rolId)) {
        ids.push(asignacion.rolId);
      }
    });
    return ids;
  }

  function registrarEvento(id, documento) {
    iam.auditoria.updateOne(
      { _id: id },
      { $setOnInsert: { _id: id, ...documento } },
      { upsert: true }
    );
  }

  function aplicarAccesoAprobado(solicitud) {
    const empleados = iam.empleados;
    const fechaDecision = solicitud.fechaCierre;

    if (solicitud.tipo === "ALTA") {
      const aprobador = solicitud.aprobaciones.find((paso) => paso.estado === "APROBADA");
      empleados.updateOne(
        { _id: solicitud.solicitanteId },
        {
          $addToSet: {
            rolesDirectos: {
              rolId: solicitud.rolSolicitadoId,
              origen: "SOLICITUD",
              solicitudOrigenId: solicitud._id,
              asignadoPorId: aprobador.aprobadorId,
              motivo: `Solicitud aprobada: ${solicitud._id}`,
              fechaInicio: fechaDecision,
              fechaFin: null
            }
          }
        }
      );
      return;
    }

    const rolQueFinaliza = solicitud.tipo === "BAJA"
      ? solicitud.rolSolicitadoId
      : solicitud.rolAnteriorId;
    const empleadoAntes = requerido("empleados", solicitud.solicitanteId);
    const yaFinalizado = (empleadoAntes.rolesDirectos ?? []).some(
      (asignacion) => asignacion.rolId === rolQueFinaliza
        && asignacion.fechaFin instanceof Date
        && asignacion.fechaFin.getTime() === fechaDecision.getTime()
    );
    const resultado = empleados.updateOne(
      {
        _id: solicitud.solicitanteId,
        rolesDirectos: {
          $elemMatch: { rolId: rolQueFinaliza, fechaFin: null }
        }
      },
      { $set: { "rolesDirectos.$[asignacion].fechaFin": fechaDecision } },
      {
        arrayFilters: [
          { "asignacion.rolId": rolQueFinaliza, "asignacion.fechaFin": null }
        ]
      }
    );

    if (resultado.modifiedCount === 0 && !yaFinalizado) {
      throw new Error(
        `No hay una asignación directa vigente de ${rolQueFinaliza} para ${solicitud.solicitanteId}.`
      );
    }

    if (solicitud.tipo === "MODIFICACION") {
      const aprobador = solicitud.aprobaciones.find((paso) => paso.estado === "APROBADA");
      empleados.updateOne(
        { _id: solicitud.solicitanteId },
        {
          $addToSet: {
            rolesDirectos: {
              rolId: solicitud.rolSolicitadoId,
              origen: "SOLICITUD",
              solicitudOrigenId: solicitud._id,
              asignadoPorId: aprobador.aprobadorId,
              motivo: `Modificación aprobada: ${solicitud._id}`,
              fechaInicio: fechaDecision,
              fechaFin: null
            }
          }
        }
      );
    }
  }

  function aprobarPaso(solicitudId, numeroPaso, aprobadorId, comentario) {
    let solicitud = requerido("solicitudes", solicitudId);
    const aprobador = requerido("empleados", aprobadorId);
    requerido("roles", solicitud.rolSolicitadoId);

    if (solicitud.solicitanteId === aprobadorId) {
      throw new Error("Una persona no puede aprobar su propia solicitud.");
    }

    const paso = solicitud.aprobaciones.find(
      (item) => Number(item.paso) === numeroPaso
    );
    if (!paso) throw new Error(`No existe el paso ${numeroPaso} en ${solicitudId}.`);
    const rolesDelAprobador = rolesEfectivos(aprobador);

    if (!rolesDelAprobador.includes(paso.rolAprobadorId)) {
      throw new Error(
        `${aprobadorId} no tiene el rol requerido ${paso.rolAprobadorId}.`
      );
    }

    if (paso.estado === "PENDIENTE") {
      const fechaDecision = new Date();
      const resultado = iam.solicitudes.updateOne(
        {
          _id: solicitudId,
          estado: "EN_APROBACION",
          aprobaciones: {
            $elemMatch: { paso: numeroPaso, estado: "PENDIENTE" }
          }
        },
        {
          $set: {
            "aprobaciones.$[paso].estado": "APROBADA",
            "aprobaciones.$[paso].aprobadorId": aprobadorId,
            "aprobaciones.$[paso].fechaDecision": fechaDecision,
            "aprobaciones.$[paso].comentario": comentario
          }
        },
        {
          arrayFilters: [
            { "paso.paso": numeroPaso, "paso.estado": "PENDIENTE" }
          ]
        }
      );

      if (resultado.modifiedCount !== 1) {
        throw new Error(`No se pudo registrar la aprobación de ${solicitudId}.`);
      }

      solicitud = requerido("solicitudes", solicitudId);
      const todosAprobaron = solicitud.aprobaciones.every(
        (item) => item.estado === "APROBADA"
      );

      if (todosAprobaron) {
        iam.solicitudes.updateOne(
          { _id: solicitudId, estado: "EN_APROBACION" },
          { $set: { estado: "APROBADA", fechaCierre: fechaDecision } }
        );
        solicitud = requerido("solicitudes", solicitudId);
        aplicarAccesoAprobado(solicitud);
      }

      registrarEvento(`AUD-${solicitudId}-PASO-${numeroPaso}`, {
        actorId: aprobadorId,
        solicitudId,
        objetoTipo: "APROBACION",
        objetoId: `${solicitudId}-PASO-${numeroPaso}`,
        accion: "SOLICITUD_APROBADA",
        fechaEvento: fechaDecision,
        detalle: { numeroPaso, comentario }
      });
      print(`Paso ${numeroPaso} aprobado por ${aprobadorId}.`);
      return;
    }

    if (paso.estado === "APROBADA" && solicitud.estado === "APROBADA") {
      // Permite volver a correr el archivo sin duplicar la asignación del rol.
      aplicarAccesoAprobado(solicitud);
      print(`La solicitud ${solicitudId} ya estaba aprobada.`);
      return;
    }

    print(`La solicitud ${solicitudId} no tiene un paso pendiente para aprobar.`);
  }

  function crearSolicitud({ id, solicitanteId, rolId, motivo }) {
    requerido("empleados", solicitanteId);
    const rol = requerido("roles", rolId);
    if (!rol.activo) throw new Error(`El rol ${rolId} está inactivo.`);

    const fechaCreacion = new Date();
    crearSolicitudSiFalta({
      _id: id,
      solicitanteId,
      rolSolicitadoId: rolId,
      rolAnteriorId: null,
      tipo: "ALTA",
      estado: "EN_APROBACION",
      motivo,
      fechaCreacion,
      fechaCierre: null,
      aprobaciones: [
        {
          paso: NumberInt(1),
          rolAprobadorId: "ROL_APROBADOR_RRHH",
          aprobadorId: null,
          estado: "PENDIENTE",
          fechaAsignacion: fechaCreacion,
          fechaDecision: null,
          comentario: null
        }
      ]
    });
  }

  // Dos pedidos: uno será aprobado y el otro quedará pendiente para las consultas.
  crearSolicitud({
    id: "SOL-DEMO-001",
    solicitanteId: "EMP-0001",
    rolId: "ROL_AUDITOR",
    motivo: "Necesito revisar reportes durante el control interno."
  });
  crearSolicitud({
    id: "SOL-DEMO-002",
    solicitanteId: "EMP-0001",
    rolId: "ROL_CONSULTA_FIN",
    motivo: "Necesito consultar los reportes financieros del proyecto."
  });

  // El empleado EMP-0002 hereda el rol aprobador desde su puesto.
  aprobarPaso(
    "SOL-DEMO-001",
    1,
    "EMP-0002",
    "Aprobado para la tarea de auditoría."
  );

  print("\nSolicitudes pendientes:");
  printjson(
    iam.solicitudes.find(
      { estado: { $in: ["PENDIENTE", "EN_APROBACION"] } },
      { _id: 1, solicitanteId: 1, rolSolicitadoId: 1, estado: 1 }
    ).toArray()
  );

  const empleado = requerido("empleados", "EMP-0001");
  const idsRoles = rolesEfectivos(empleado);
  const roles = iam.roles.find({ _id: { $in: idsRoles }, activo: true }).toArray();
  const accesos = [];

  for (const rol of roles) {
    for (const referencia of rol.permisos) {
      const aplicacion = iam.aplicaciones.findOne({ _id: referencia.aplicacionId });
      if (!aplicacion || !aplicacion.activo) continue;

      let permiso = null;
      for (const item of aplicacion.permisos) {
        if (item.permisoId === referencia.permisoId && item.activo) {
          permiso = item;
          break;
        }
      }

      if (permiso) {
        accesos.push({
          rol: rol.nombre,
          aplicacion: aplicacion.nombre,
          permiso: permiso.nombre
        });
      }
    }
  }

  print("\nAccesos efectivos de EMP-0001:");
  printjson(accesos);

  print("\nHistorial de auditoría de SOL-DEMO-001:");
  printjson(
    iam.auditoria.find({ solicitudId: "SOL-DEMO-001" })
      .sort({ fechaEvento: 1 })
      .toArray()
  );
})();
