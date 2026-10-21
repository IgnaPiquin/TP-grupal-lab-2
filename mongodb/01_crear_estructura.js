// Crea las colecciones y valida la forma básica de sus documentos.
// Se puede ejecutar más de una vez: actualiza validadores existentes y no borra datos.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam");

  const nullableString = { bsonType: ["string", "null"] };
  const nullableDate = { bsonType: ["date", "null"] };
  const approvalStep = {
    bsonType: "object",
    required: [
      "paso", "rolAprobadorId", "aprobadorId", "estado",
      "fechaAsignacion", "fechaDecision", "comentario"
    ],
    properties: {
      paso: { bsonType: ["int", "long", "double"], minimum: 1 },
      rolAprobadorId: { bsonType: "string" },
      aprobadorId: nullableString,
      estado: { enum: ["PENDIENTE", "APROBADA", "RECHAZADA"] },
      fechaAsignacion: { bsonType: "date" },
      fechaDecision: nullableDate,
      comentario: nullableString
    }
  };

  const roleGrant = {
    bsonType: "object",
    required: [
      "rolId", "origen", "solicitudOrigenId", "asignadoPorId",
      "motivo", "fechaInicio", "fechaFin"
    ],
    properties: {
      rolId: { bsonType: "string" },
      origen: { enum: ["DIRECTO", "SOLICITUD"] },
      solicitudOrigenId: nullableString,
      asignadoPorId: nullableString,
      motivo: nullableString,
      fechaInicio: { bsonType: "date" },
      fechaFin: nullableDate
    }
  };

  const collections = [
    {
      name: "areas",
      schema: {
        bsonType: "object",
        required: ["_id", "nombre", "activo"],
        properties: {
          _id: { bsonType: "string" },
          nombre: { bsonType: "string", minLength: 1 },
          descripcion: { bsonType: "string" },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      name: "puestos",
      schema: {
        bsonType: "object",
        required: ["_id", "nombre", "roles", "activo"],
        properties: {
          _id: { bsonType: "string" },
          nombre: { bsonType: "string", minLength: 1 },
          descripcion: { bsonType: "string" },
          roles: { bsonType: "array", items: { bsonType: "string" } },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      name: "roles",
      schema: {
        bsonType: "object",
        required: ["_id", "codigo", "nombre", "permisos", "activo"],
        properties: {
          _id: { bsonType: "string" },
          codigo: { bsonType: "string", minLength: 1 },
          nombre: { bsonType: "string", minLength: 1 },
          descripcion: { bsonType: "string" },
          permisos: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["aplicacionId", "permisoId"],
              properties: {
                aplicacionId: { bsonType: "string" },
                permisoId: { bsonType: "string" }
              }
            }
          },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      name: "aplicaciones",
      schema: {
        bsonType: "object",
        required: ["_id", "codigo", "nombre", "permisos", "activo"],
        properties: {
          _id: { bsonType: "string" },
          codigo: { bsonType: "string", minLength: 1 },
          nombre: { bsonType: "string", minLength: 1 },
          descripcion: { bsonType: "string" },
          permisos: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["permisoId", "codigo", "nombre", "activo"],
              properties: {
                permisoId: { bsonType: "string" },
                codigo: { bsonType: "string" },
                nombre: { bsonType: "string" },
                descripcion: { bsonType: "string" },
                activo: { bsonType: "bool" }
              }
            }
          },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      name: "empleados",
      schema: {
        bsonType: "object",
        required: [
          "_id", "legajo", "nombre", "apellido", "email",
          "areaId", "puestoId", "fechaAlta", "rolesDirectos", "activo"
        ],
        properties: {
          _id: { bsonType: "string" },
          legajo: { bsonType: "string", minLength: 1 },
          nombre: { bsonType: "string", minLength: 1 },
          apellido: { bsonType: "string", minLength: 1 },
          email: { bsonType: "string", minLength: 3 },
          areaId: { bsonType: "string" },
          puestoId: { bsonType: "string" },
          fechaAlta: { bsonType: "date" },
          rolesDirectos: { bsonType: "array", items: roleGrant },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      name: "solicitudes",
      schema: {
        bsonType: "object",
        required: [
          "_id", "solicitanteId", "rolSolicitadoId", "rolAnteriorId",
          "tipo", "estado", "motivo", "fechaCreacion", "fechaCierre", "aprobaciones"
        ],
        properties: {
          _id: { bsonType: "string" },
          solicitanteId: { bsonType: "string" },
          rolSolicitadoId: { bsonType: "string" },
          rolAnteriorId: nullableString,
          tipo: { enum: ["ALTA", "BAJA", "MODIFICACION"] },
          estado: {
            enum: ["PENDIENTE", "EN_APROBACION", "APROBADA", "RECHAZADA", "CANCELADA"]
          },
          motivo: { bsonType: "string", minLength: 1 },
          fechaCreacion: { bsonType: "date" },
          fechaCierre: nullableDate,
          aprobaciones: { bsonType: "array", items: approvalStep }
        }
      }
    },
    {
      name: "auditoria",
      schema: {
        bsonType: "object",
        required: [
          "_id", "actorId", "solicitudId", "objetoTipo", "objetoId",
          "accion", "fechaEvento", "detalle"
        ],
        properties: {
          _id: { bsonType: "string" },
          actorId: nullableString,
          solicitudId: nullableString,
          objetoTipo: { bsonType: "string" },
          objetoId: { bsonType: "string" },
          accion: { bsonType: "string" },
          fechaEvento: { bsonType: "date" },
          detalle: { bsonType: "object" }
        }
      }
    }
  ];

  for (const collection of collections) {
    const validator = { $jsonSchema: collection.schema };
    const existing = iam.getCollectionInfos({ name: collection.name }).length > 0;

    if (existing) {
      const result = iam.runCommand({
        collMod: collection.name,
        validator,
        validationLevel: "strict",
        validationAction: "error"
      });
      if (result.ok !== 1) {
        throw new Error(`No se pudo actualizar el validador de ${collection.name}`);
      }
      print(`Validador actualizado: ${collection.name}`);
    } else {
      iam.createCollection(collection.name, {
        validator,
        validationLevel: "strict",
        validationAction: "error"
      });
      print(`Colección creada: ${collection.name}`);
    }
  }

  print(`Estructura lista en ${iam.getName()}`);
})();
