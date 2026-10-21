// Carga datos demostrativos una sola vez por _id, sin pisar cambios posteriores.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam");
  const fechaAlta = new Date("2026-10-01T12:00:00Z");

  function guardar(nombreColeccion, documento) {
    iam.getCollection(nombreColeccion).updateOne(
      { _id: documento._id },
      { $setOnInsert: documento },
      { upsert: true }
    );
  }

  [
    {
      _id: "AREA_TI",
      nombre: "Tecnología",
      descripcion: "Desarrollo y soporte de sistemas",
      activo: true
    },
    {
      _id: "AREA_RRHH",
      nombre: "Recursos Humanos",
      descripcion: "Administración del personal",
      activo: true
    }
  ].forEach((documento) => guardar("areas", documento));

  [
    {
      _id: "APP_RRHH",
      codigo: "RRHH",
      nombre: "Gestión de personal",
      descripcion: "Aplicación de recursos humanos",
      activo: true,
      permisos: [
        {
          permisoId: "PERM_PERSONAL_LECTURA",
          codigo: "PERSONAL_LECTURA",
          nombre: "Consultar personal",
          descripcion: "Ver datos del personal",
          activo: true
        },
        {
          permisoId: "PERM_SOLICITUD_APROBAR",
          codigo: "SOLICITUD_APROBAR",
          nombre: "Aprobar solicitudes",
          descripcion: "Resolver solicitudes de acceso",
          activo: true
        }
      ]
    },
    {
      _id: "APP_FINANZAS",
      codigo: "FIN",
      nombre: "Reportes financieros",
      descripcion: "Aplicación de consulta financiera",
      activo: true,
      permisos: [
        {
          permisoId: "PERM_REPORTES_FIN_LECTURA",
          codigo: "REPORTES_LECTURA",
          nombre: "Consultar reportes financieros",
          descripcion: "Ver reportes financieros",
          activo: true
        }
      ]
    }
  ].forEach((documento) => guardar("aplicaciones", documento));

  [
    {
      _id: "ROL_ANALISTA_TI",
      codigo: "ANALISTA_TI",
      nombre: "Analista de tecnología",
      descripcion: "Consulta información básica del personal",
      activo: true,
      permisos: [
        { aplicacionId: "APP_RRHH", permisoId: "PERM_PERSONAL_LECTURA" }
      ]
    },
    {
      _id: "ROL_APROBADOR_RRHH",
      codigo: "APROBADOR_RRHH",
      nombre: "Aprobador de Recursos Humanos",
      descripcion: "Puede resolver solicitudes de acceso",
      activo: true,
      permisos: [
        { aplicacionId: "APP_RRHH", permisoId: "PERM_SOLICITUD_APROBAR" }
      ]
    },
    {
      _id: "ROL_AUDITOR",
      codigo: "AUDITOR",
      nombre: "Auditor",
      descripcion: "Consulta información de personal y reportes financieros",
      activo: true,
      permisos: [
        { aplicacionId: "APP_RRHH", permisoId: "PERM_PERSONAL_LECTURA" },
        { aplicacionId: "APP_FINANZAS", permisoId: "PERM_REPORTES_FIN_LECTURA" }
      ]
    },
    {
      _id: "ROL_CONSULTA_FIN",
      codigo: "CONSULTA_FINANZAS",
      nombre: "Consulta de finanzas",
      descripcion: "Consulta reportes financieros",
      activo: true,
      permisos: [
        { aplicacionId: "APP_FINANZAS", permisoId: "PERM_REPORTES_FIN_LECTURA" }
      ]
    }
  ].forEach((documento) => guardar("roles", documento));

  [
    {
      _id: "PUESTO_ANALISTA_TI",
      nombre: "Analista de sistemas",
      descripcion: "Puesto del área de tecnología",
      roles: ["ROL_ANALISTA_TI"],
      activo: true
    },
    {
      _id: "PUESTO_JEFE_RRHH",
      nombre: "Jefe de Recursos Humanos",
      descripcion: "Puesto habilitado para aprobar accesos de RRHH",
      roles: ["ROL_APROBADOR_RRHH"],
      activo: true
    }
  ].forEach((documento) => guardar("puestos", documento));

  [
    {
      _id: "EMP-0001",
      legajo: "1001",
      nombre: "Lucía",
      apellido: "Pérez",
      email: "lucia.perez@ejemplo.com",
      areaId: "AREA_TI",
      puestoId: "PUESTO_ANALISTA_TI",
      fechaAlta,
      rolesDirectos: [],
      activo: true
    },
    {
      _id: "EMP-0002",
      legajo: "2001",
      nombre: "Martín",
      apellido: "Gómez",
      email: "martin.gomez@ejemplo.com",
      areaId: "AREA_RRHH",
      puestoId: "PUESTO_JEFE_RRHH",
      fechaAlta,
      rolesDirectos: [],
      activo: true
    }
  ].forEach((documento) => guardar("empleados", documento));

  print("Datos de ejemplo cargados en gestor_accesos_iam.");
})();
