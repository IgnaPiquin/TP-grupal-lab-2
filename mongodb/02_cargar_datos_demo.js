// Carga empleados como agregados: área, puesto, roles, aplicaciones y permisos
// quedan embebidos en el documento que se consulta para conocer sus accesos.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam_embebido");
  const fechaAlta = new Date("2026-10-01T12:00:00Z");

  const rolAnalista = {
    codigo: "ANALISTA_TI",
    nombre: "Analista de tecnología",
    descripcion: "Consulta información básica del personal",
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
      }
    ]
  };

  const rolAprobador = {
    codigo: "APROBADOR_RRHH",
    nombre: "Aprobador de Recursos Humanos",
    descripcion: "Puede resolver solicitudes de acceso",
    activo: true,
    aplicaciones: [
      {
        codigo: "RRHH",
        nombre: "Gestión de personal",
        descripcion: "Aplicación de recursos humanos",
        activo: true,
        permisos: [
          {
            codigo: "SOLICITUD_APROBAR",
            nombre: "Aprobar solicitudes",
            descripcion: "Resolver solicitudes de acceso",
            activo: true
          }
        ]
      }
    ]
  };

  const empleadoSolicitante = {
    _id: "1001",
    legajo: "1001",
    nombre: "Lucía",
    apellido: "Pérez",
    email: "lucia.perez@ejemplo.com",
    area: {
      codigo: "TI",
      nombre: "Tecnología",
      descripcion: "Desarrollo y soporte de sistemas",
      activo: true
    },
    puesto: {
      codigo: "ANALISTA_SISTEMAS",
      nombre: "Analista de sistemas",
      descripcion: "Puesto del área de tecnología",
      activo: true,
      roles: [rolAnalista]
    },
    fechaAlta,
    rolesDirectos: [],
    activo: true
  };

  const empleadoAprobador = {
    _id: "2001",
    legajo: "2001",
    nombre: "Martín",
    apellido: "Gómez",
    email: "martin.gomez@ejemplo.com",
    area: {
      codigo: "RRHH",
      nombre: "Recursos Humanos",
      descripcion: "Administración del personal",
      activo: true
    },
    puesto: {
      codigo: "JEFE_RRHH",
      nombre: "Jefe de Recursos Humanos",
      descripcion: "Puesto habilitado para aprobar accesos de RRHH",
      activo: true,
      roles: [rolAprobador]
    },
    fechaAlta,
    rolesDirectos: [],
    activo: true
  };

  // Reemplaza los dos documentos demo para volver al estado inicial conocido.
  iam.empleados.replaceOne(
    { _id: empleadoSolicitante._id },
    empleadoSolicitante,
    { upsert: true }
  );
  iam.empleados.replaceOne(
    { _id: empleadoAprobador._id },
    empleadoAprobador,
    { upsert: true }
  );

  print("Se cargaron 2 empleados con área, puesto y rol embebidos.");
  print("Las aplicaciones y sus permisos están dentro de cada documento de rol.");
})();
