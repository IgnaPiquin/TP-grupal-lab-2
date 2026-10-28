// Crea agregados documentales validados para el gestor IAM.
// No define colecciones de catálogo ni relaciones por campos ID.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam_embebido");
  const string = { bsonType: "string" };
  const nullableDate = { bsonType: ["date", "null"] };
  const nullableString = { bsonType: ["string", "null"] };

  const rolResumen = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string
    }
  };

  const permiso = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion", "activo"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string,
      activo: { bsonType: "bool" }
    }
  };

  const aplicacion = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion", "permisos", "activo"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string,
      permisos: { bsonType: "array", items: permiso },
      activo: { bsonType: "bool" }
    }
  };

  const rol = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion", "aplicaciones", "activo"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string,
      aplicaciones: { bsonType: "array", items: aplicacion },
      activo: { bsonType: "bool" }
    }
  };

  const area = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion", "activo"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string,
      activo: { bsonType: "bool" }
    }
  };

  const puesto = {
    bsonType: "object",
    required: ["codigo", "nombre", "descripcion", "roles", "activo"],
    properties: {
      codigo: string,
      nombre: string,
      descripcion: string,
      roles: { bsonType: "array", items: rol },
      activo: { bsonType: "bool" }
    }
  };

  const persona = {
    bsonType: "object",
    required: ["legajo", "nombre", "apellido", "email", "area", "puesto", "rolesEfectivos"],
    properties: {
      legajo: string,
      nombre: string,
      apellido: string,
      email: string,
      area: {
        bsonType: "object",
        required: ["codigo", "nombre", "descripcion"],
        properties: {
          codigo: string,
          nombre: string,
          descripcion: string
        }
      },
      puesto: {
        bsonType: "object",
        required: ["codigo", "nombre", "descripcion"],
        properties: {
          codigo: string,
          nombre: string,
          descripcion: string
        }
      },
      rolesEfectivos: { bsonType: "array", items: rolResumen }
    }
  };

  const asignacionDirecta = {
    bsonType: "object",
    required: ["rol", "origen", "motivo", "asignadoPor", "fechaInicio", "fechaFin"],
    properties: {
      rol,
      origen: { enum: ["DIRECTO", "SOLICITUD"] },
      motivo: string,
      asignadoPor: { bsonType: ["object", "null"] },
      fechaInicio: { bsonType: "date" },
      fechaFin: nullableDate
    }
  };

  const pasoAprobacion = {
    bsonType: "object",
    required: [
      "numeroPaso", "rolAprobador", "aprobadorAsignado", "aprobador",
      "estado", "fechaAsignacion", "fechaDecision", "comentario"
    ],
    properties: {
      numeroPaso: { bsonType: ["int", "long", "double"], minimum: 1 },
      rolAprobador: rolResumen,
      aprobadorAsignado: persona,
      aprobador: { bsonType: ["object", "null"] },
      estado: { enum: ["PENDIENTE", "APROBADA", "RECHAZADA"] },
      fechaAsignacion: { bsonType: "date" },
      fechaDecision: nullableDate,
      comentario: nullableString
    }
  };

  const eventoAuditoria = {
    bsonType: "object",
    required: ["actor", "accion", "fechaEvento", "detalle"],
    properties: {
      actor: {
        bsonType: "object",
        required: ["legajo", "nombre", "apellido"],
        properties: {
          legajo: string,
          nombre: string,
          apellido: string
        }
      },
      accion: string,
      fechaEvento: { bsonType: "date" },
      detalle: { bsonType: "object" }
    }
  };

  const schemas = [
    {
      nombre: "empleados",
      esquema: {
        bsonType: "object",
        required: [
          "_id", "legajo", "nombre", "apellido", "email", "area", "puesto",
          "fechaAlta", "rolesDirectos", "activo"
        ],
        properties: {
          _id: string,
          legajo: string,
          nombre: string,
          apellido: string,
          email: string,
          area,
          puesto,
          fechaAlta: { bsonType: "date" },
          rolesDirectos: { bsonType: "array", items: asignacionDirecta },
          activo: { bsonType: "bool" }
        }
      }
    },
    {
      nombre: "solicitudes",
      esquema: {
        bsonType: "object",
        required: [
          "_id", "solicitante", "rolSolicitado", "rolAnterior", "tipo", "estado",
          "motivo", "fechaCreacion", "fechaCierre", "aprobaciones", "auditoria"
        ],
        properties: {
          _id: string,
          solicitante: persona,
          rolSolicitado: rol,
          rolAnterior: { bsonType: ["object", "null"] },
          tipo: { enum: ["ALTA", "BAJA", "MODIFICACION"] },
          estado: {
            enum: ["PENDIENTE", "EN_APROBACION", "APROBADA", "RECHAZADA", "CANCELADA"]
          },
          motivo: string,
          fechaCreacion: { bsonType: "date" },
          fechaCierre: nullableDate,
          aprobaciones: { bsonType: "array", items: pasoAprobacion },
          auditoria: { bsonType: "array", items: eventoAuditoria }
        }
      }
    }
  ];

  for (const coleccion of schemas) {
    const validator = { $jsonSchema: coleccion.esquema };
    const existe = iam.getCollectionInfos({ name: coleccion.nombre }).length > 0;

    if (existe) {
      const resultado = iam.runCommand({
        collMod: coleccion.nombre,
        validator,
        validationLevel: "strict",
        validationAction: "error"
      });
      if (resultado.ok !== 1) throw new Error(`No se validó ${coleccion.nombre}`);
      print(`Validador actualizado: ${coleccion.nombre}`);
    } else {
      iam.createCollection(coleccion.nombre, {
        validator,
        validationLevel: "strict",
        validationAction: "error"
      });
      print(`Colección creada: ${coleccion.nombre}`);
    }
  }

  print(`Estructura embebida lista en ${iam.getName()}.`);
})();
