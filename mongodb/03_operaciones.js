// Operaciones del ejemplo sobre dos agregados: empleados y solicitudes.
// Las consultas no buscan datos relacionados en otras colecciones.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam_embebido");
  const fechaCreacion = new Date();

  const solicitante = {
    legajo: "1001",
    nombre: "Lucía",
    apellido: "Pérez",
    email: "lucia.perez@ejemplo.com",
    area: {
      codigo: "TI",
      nombre: "Tecnología",
      descripcion: "Desarrollo y soporte de sistemas"
    },
    puesto: {
      codigo: "ANALISTA_SISTEMAS",
      nombre: "Analista de sistemas",
      descripcion: "Puesto del área de tecnología"
    },
    rolesEfectivos: [
      {
        codigo: "ANALISTA_TI",
        nombre: "Analista de tecnología",
        descripcion: "Consulta información básica del personal"
      }
    ]
  };

  const aprobadorAsignado = {
    legajo: "2001",
    nombre: "Martín",
    apellido: "Gómez",
    email: "martin.gomez@ejemplo.com",
    area: {
      codigo: "RRHH",
      nombre: "Recursos Humanos",
      descripcion: "Administración del personal"
    },
    puesto: {
      codigo: "JEFE_RRHH",
      nombre: "Jefe de Recursos Humanos",
      descripcion: "Puesto habilitado para aprobar accesos de RRHH"
    },
    rolesEfectivos: [
      {
        codigo: "APROBADOR_RRHH",
        nombre: "Aprobador de Recursos Humanos",
        descripcion: "Puede resolver solicitudes de acceso"
      }
    ]
  };

  const rolAuditor = {
    codigo: "AUDITOR",
    nombre: "Auditor",
    descripcion: "Consulta información de personal y reportes financieros",
    activo: true,
    aplicaciones: [
      {
        codigo: "RRHH",
        nombre: "Gestión de personal",
        descripcion: "Aplicación de recursos humanos",
        activo: true,
        permisos: [
          {
            codigo: "PERSONAL_LECTURA",
            nombre: "Consultar personal",
            descripcion: "Ver datos del personal",
            activo: true
          }
        ]
      },
      {
        codigo: "FIN",
        nombre: "Reportes financieros",
        descripcion: "Aplicación de consulta financiera",
        activo: true,
        permisos: [
          {
            codigo: "REPORTES_LECTURA",
            nombre: "Consultar reportes financieros",
            descripcion: "Ver reportes financieros",
            activo: true
          }
        ]
      }
    ]
  };

  const rolConsultaFinanzas = {
    codigo: "CONSULTA_FINANZAS",
    nombre: "Consulta de finanzas",
    descripcion: "Consulta reportes financieros",
    activo: true,
    aplicaciones: [
      {
        codigo: "FIN",
        nombre: "Reportes financieros",
        descripcion: "Aplicación de consulta financiera",
        activo: true,
        permisos: [
          {
            codigo: "REPORTES_LECTURA",
            nombre: "Consultar reportes financieros",
            descripcion: "Ver reportes financieros",
            activo: true
          }
        ]
      }
    ]
  };

  iam.solicitudes.updateOne(
    { _id: "SOL-DEMO-001" },
    {
      $setOnInsert: {
        _id: "SOL-DEMO-001",
        solicitante,
        rolSolicitado: rolAuditor,
        rolAnterior: null,
        tipo: "ALTA",
        estado: "EN_APROBACION",
        motivo: "Necesito revisar reportes durante el control interno.",
        fechaCreacion,
        fechaCierre: null,
        aprobaciones: [
          {
            numeroPaso: 1,
            rolAprobador: {
              codigo: "APROBADOR_RRHH",
              nombre: "Aprobador de Recursos Humanos",
              descripcion: "Puede resolver solicitudes de acceso"
            },
            aprobadorAsignado,
            aprobador: null,
            estado: "PENDIENTE",
            fechaAsignacion: fechaCreacion,
            fechaDecision: null,
            comentario: null
          }
        ],
        auditoria: [
          {
            actor: {
              legajo: solicitante.legajo,
              nombre: solicitante.nombre,
              apellido: solicitante.apellido
            },
            accion: "SOLICITUD_CREADA",
            fechaEvento: fechaCreacion,
            detalle: {
              tipo: "ALTA",
              rolSolicitado: rolAuditor.nombre,
              motivo: "Necesito revisar reportes durante el control interno."
            }
          }
        ]
      }
    },
    { upsert: true }
  );

  iam.solicitudes.updateOne(
    { _id: "SOL-DEMO-002" },
    {
      $setOnInsert: {
        _id: "SOL-DEMO-002",
        solicitante,
        rolSolicitado: rolConsultaFinanzas,
        rolAnterior: null,
        tipo: "ALTA",
        estado: "EN_APROBACION",
        motivo: "Necesito consultar los reportes financieros del proyecto.",
        fechaCreacion,
        fechaCierre: null,
        aprobaciones: [
          {
            numeroPaso: 1,
            rolAprobador: {
              codigo: "APROBADOR_RRHH",
              nombre: "Aprobador de Recursos Humanos",
              descripcion: "Puede resolver solicitudes de acceso"
            },
            aprobadorAsignado,
            aprobador: null,
            estado: "PENDIENTE",
            fechaAsignacion: fechaCreacion,
            fechaDecision: null,
            comentario: null
          }
        ],
        auditoria: [
          {
            actor: {
              legajo: solicitante.legajo,
              nombre: solicitante.nombre,
              apellido: solicitante.apellido
            },
            accion: "SOLICITUD_CREADA",
            fechaEvento: fechaCreacion,
            detalle: {
              tipo: "ALTA",
              rolSolicitado: rolConsultaFinanzas.nombre,
              motivo: "Necesito consultar los reportes financieros del proyecto."
            }
          }
        ]
      }
    },
    { upsert: true }
  );

  const solicitud = iam.solicitudes.findOne({ _id: "SOL-DEMO-001" });
  const paso = solicitud.aprobaciones[0];

  if (solicitud.solicitante.legajo === paso.aprobadorAsignado.legajo) {
    throw new Error("Una persona no puede aprobar su propia solicitud.");
  }
  let aprobadorAutorizado = false;
  for (const rolEfectivo of paso.aprobadorAsignado.rolesEfectivos) {
    if (rolEfectivo.codigo === paso.rolAprobador.codigo) aprobadorAutorizado = true;
  }
  if (!aprobadorAutorizado) {
    throw new Error("El aprobador no tiene el rol requerido.");
  }

  if (solicitud.estado === "EN_APROBACION" && paso.estado === "PENDIENTE") {
    const fechaDecision = new Date();
    iam.solicitudes.updateOne(
      {
        _id: "SOL-DEMO-001",
        estado: "EN_APROBACION",
        aprobaciones: {
          $elemMatch: { numeroPaso: 1, estado: "PENDIENTE" }
        }
      },
      {
        $set: {
          estado: "APROBADA",
          fechaCierre: fechaDecision,
          "aprobaciones.$[paso].estado": "APROBADA",
          "aprobaciones.$[paso].aprobador": paso.aprobadorAsignado,
          "aprobaciones.$[paso].fechaDecision": fechaDecision,
          "aprobaciones.$[paso].comentario": "Aprobado para la tarea de auditoría."
        },
        $push: {
          auditoria: {
            actor: {
              legajo: paso.aprobadorAsignado.legajo,
              nombre: paso.aprobadorAsignado.nombre,
              apellido: paso.aprobadorAsignado.apellido
            },
            accion: "SOLICITUD_APROBADA",
            fechaEvento: fechaDecision,
            detalle: {
              numeroPaso: 1,
              comentario: "Aprobado para la tarea de auditoría."
            }
          }
        }
      },
      { arrayFilters: [{ "paso.numeroPaso": 1, "paso.estado": "PENDIENTE" }] }
    );
    print("SOL-DEMO-001 aprobada por Martín Gómez (2001).");
  }

  const solicitudAprobada = iam.solicitudes.findOne({ _id: "SOL-DEMO-001" });
  if (solicitudAprobada.estado === "APROBADA") {
    iam.empleados.updateOne(
      { _id: solicitudAprobada.solicitante.legajo },
      {
        $addToSet: {
          rolesDirectos: {
            rol: solicitudAprobada.rolSolicitado,
            origen: "SOLICITUD",
            motivo: `Solicitud aprobada: ${solicitudAprobada.motivo}`,
            asignadoPor: solicitudAprobada.aprobaciones[0].aprobador,
            fechaInicio: solicitudAprobada.fechaCierre,
            fechaFin: null
          }
        }
      }
    );
  }

  print("\nSolicitudes pendientes (cada resultado contiene sus datos relacionados):");
  printjson(
    iam.solicitudes.find(
      { estado: { $in: ["PENDIENTE", "EN_APROBACION"] } },
      { _id: 1, solicitante: 1, rolSolicitado: 1, aprobaciones: 1, estado: 1 }
    ).toArray()
  );

  print("\nAccesos efectivos de Lucía Pérez (consulta sobre un documento de empleado):");
  printjson(
    iam.empleados.aggregate([
      { $match: { _id: "1001" } },
      {
        $project: {
          nombreEmpleado: { $concat: ["$nombre", " ", "$apellido"] },
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
                          { $lte: ["$$asignacion.fechaInicio", new Date()] },
                          {
                            $or: [
                              { $eq: ["$$asignacion.fechaFin", null] },
                              { $gt: ["$$asignacion.fechaFin", new Date()] }
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
          _id: 0,
          empleado: "$nombreEmpleado",
          rol: "$roles.nombre",
          aplicacion: "$roles.aplicaciones.nombre",
          permiso: "$roles.aplicaciones.permisos.nombre"
        }
      }
    ]).toArray()
  );

  print("\nAuditoría embebida en SOL-DEMO-001:");
  printjson(iam.solicitudes.findOne({ _id: "SOL-DEMO-001" }, { _id: 1, auditoria: 1 }));
})();
