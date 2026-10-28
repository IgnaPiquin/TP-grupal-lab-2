// Ejecuta las mismas consultas de lectura que TP IAM - 05 benchmark consultas
// en Oracle. La medición es local, con mongosh, y se informa en milisegundos.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam_embebido");
  const ahora = new Date();
  const cantidadRepeticiones = 5;

  const consultaPermisos = [
    { $match: { _id: { $gte: "BEN-E-00001", $lte: "BEN-E-05000" }, activo: true } },
    {
      $project: {
        roles: {
          $concatArrays: [
            "$puesto.roles",
            {
              $map: {
                input: {
                  $filter: {
                    input: "$rolesDirectos",
                    as: "asignacion",
                    cond: {
                      $and: [
                        { $lte: ["$$asignacion.fechaInicio", ahora] },
                        {
                          $or: [
                            { $eq: ["$$asignacion.fechaFin", null] },
                            { $gte: ["$$asignacion.fechaFin", ahora] }
                          ]
                        }
                      ]
                    }
                  }
                },
                as: "asignacion",
                in: "$$asignacion.rol"
              }
            }
          ]
        }
      }
    },
    { $unwind: "$roles" },
    { $unwind: "$roles.aplicaciones" },
    { $unwind: "$roles.aplicaciones.permisos" },
    {
      $match: {
        "roles.activo": true,
        "roles.aplicaciones.activo": true,
        "roles.aplicaciones.permisos.activo": true
      }
    },
    {
      $project: {
        empleado: "$_id",
        rol: "$roles.codigo",
        aplicacion: "$roles.aplicaciones.codigo",
        permiso: "$roles.aplicaciones.permisos.codigo"
      }
    },
    {
      $group: {
        _id: {
          empleado: "$empleado",
          rol: "$rol",
          aplicacion: "$aplicacion",
          permiso: "$permiso"
        }
      }
    },
    { $count: "filas" }
  ];

  const consultaSolicitudes = [
    {
      $match: {
        _id: { $gte: "BEN-S-00001", $lte: "BEN-S-05000" },
        estado: "EN_APROBACION",
        "solicitante.activo": true
      }
    },
    { $unwind: "$aprobaciones" },
    {
      $match: {
        "aprobaciones.estado": "PENDIENTE",
        "aprobaciones.rolAprobador.activo": true,
        "aprobaciones.aprobadorAsignado.activo": true
      }
    },
    { $unwind: "$rolSolicitado.aplicaciones" },
    { $unwind: "$rolSolicitado.aplicaciones.permisos" },
    {
      $match: {
        "rolSolicitado.activo": true,
        "rolSolicitado.aplicaciones.activo": true,
        "rolSolicitado.aplicaciones.permisos.activo": true
      }
    },
    {
      $project: {
        solicitud: "$_id",
        solicitante: "$solicitante.legajo",
        rol: "$rolSolicitado.codigo",
        aprobador: "$aprobaciones.aprobadorAsignado.legajo",
        aplicacion: "$rolSolicitado.aplicaciones.codigo",
        permiso: "$rolSolicitado.aplicaciones.permisos.codigo"
      }
    },
    { $count: "filas" }
  ];

  const ejecutar = (coleccion, nombre, pipeline, filasEsperadas) => {
    const mediciones = [];
    let filas = null;
    for (let repeticion = 1; repeticion <= cantidadRepeticiones; repeticion += 1) {
      const inicio = Date.now();
      const resultado = iam.getCollection(coleccion).aggregate(pipeline).toArray();
      const milisegundos = Date.now() - inicio;
      const filasEstaVez = resultado.length === 0 ? 0 : resultado[0].filas;
      if (filas !== null && filas !== filasEstaVez) {
        throw new Error(`El conteo de ${nombre} cambió entre repeticiones.`);
      }
      if (filasEstaVez !== filasEsperadas) {
        throw new Error(`${nombre}: se esperaban ${filasEsperadas} filas y se obtuvieron ${filasEstaVez}.`);
      }
      filas = filasEstaVez;
      mediciones.push(milisegundos);
    }
    printjson({ caso: nombre, filas, milisegundosPorEjecucion: mediciones });
  };

  ejecutar("empleados", "permisos_efectivos", consultaPermisos, 12500);
  ejecutar("solicitudes", "solicitudes_pendientes_detalle", consultaSolicitudes, 7500);
})();
