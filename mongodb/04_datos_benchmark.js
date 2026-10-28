// Genera un conjunto sintetico equivalente al de Oracle:
// 5.000 empleados y 5.000 solicitudes, con catalogos y relaciones embebidos.
// Ejecutar luego de 01_crear_estructura.js y 02_cargar_datos_demo.js.
(() => {
  const iam = db.getSiblingDB("gestor_accesos_iam_embebido");
  const fecha = new Date("2026-10-01T12:00:00Z");
  const cantidad = 5000;

  const permisoLecturaPersonal = {
    codigo: "PERSONAL_LECTURA",
    nombre: "Consultar personal",
    descripcion: "Ver datos del personal",
    activo: true
  };
  const permisoAprobar = {
    codigo: "SOLICITUD_APROBAR",
    nombre: "Aprobar solicitudes",
    descripcion: "Resolver solicitudes de acceso",
    activo: true
  };
  const permisoReportes = {
    codigo: "REPORTES_LECTURA",
    nombre: "Consultar reportes financieros",
    descripcion: "Ver reportes financieros",
    activo: true
  };

  const aplicacionRRHH = (permisos) => ({
    codigo: "RRHH",
    nombre: "Gestión de personal",
    descripcion: "Aplicación de recursos humanos",
    permisos,
    activo: true
  });
  const aplicacionFinanzas = {
    codigo: "FIN",
    nombre: "Reportes financieros",
    descripcion: "Aplicación de consulta financiera",
    permisos: [permisoReportes],
    activo: true
  };

  const rolAnalista = {
    codigo: "ANALISTA_TI",
    nombre: "Analista de tecnología",
    descripcion: "Consulta información básica del personal",
    aplicaciones: [aplicacionRRHH([permisoLecturaPersonal])],
    activo: true
  };
  const rolAprobador = {
    codigo: "APROBADOR_RRHH",
    nombre: "Aprobador de Recursos Humanos",
    descripcion: "Puede resolver solicitudes de acceso",
    aplicaciones: [aplicacionRRHH([permisoAprobar])],
    activo: true
  };
  const rolAuditor = {
    codigo: "AUDITOR",
    nombre: "Auditor",
    descripcion: "Consulta información de personal y reportes financieros",
    aplicaciones: [
      aplicacionRRHH([permisoLecturaPersonal]),
      aplicacionFinanzas
    ],
    activo: true
  };
  const rolConsultaFinanzas = {
    codigo: "CONSULTA_FINANZAS",
    nombre: "Consulta de finanzas",
    descripcion: "Consulta reportes financieros",
    aplicaciones: [aplicacionFinanzas],
    activo: true
  };

  const areaTI = {
    codigo: "TI",
    nombre: "Tecnología",
    descripcion: "Desarrollo y soporte de sistemas",
    activo: true
  };
  const areaRRHH = {
    codigo: "RRHH",
    nombre: "Recursos Humanos",
    descripcion: "Administración del personal",
    activo: true
  };
  const puestoAnalista = {
    codigo: "ANALISTA_SISTEMAS",
    nombre: "Analista de sistemas",
    descripcion: "Puesto del área de tecnología",
    activo: true,
    roles: [rolAnalista]
  };
  const puestoJefeRRHH = {
    codigo: "JEFE_RRHH",
    nombre: "Jefe de Recursos Humanos",
    descripcion: "Puesto habilitado para aprobar accesos de RRHH",
    activo: true,
    roles: [rolAprobador]
  };

  const resumenRol = (rol) => ({
    codigo: rol.codigo,
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    activo: rol.activo
  });
  const personaEnSolicitud = (n, par) => {
    const analista = par ? rolAnalista : rolAprobador;
    const area = par ? areaTI : areaRRHH;
    const puesto = par ? puestoAnalista : puestoJefeRRHH;
    const legajo = `BEN-${String(n).padStart(5, "0")}`;
    return {
      legajo,
      nombre: "Empleado",
      apellido: `Benchmark ${String(n).padStart(5, "0")}`,
      email: `benchmark${String(n).padStart(5, "0")}@ejemplo.com`,
      activo: true,
      area: {
        codigo: area.codigo,
        nombre: area.nombre,
        descripcion: area.descripcion
      },
      puesto: {
        codigo: puesto.codigo,
        nombre: puesto.nombre,
        descripcion: puesto.descripcion
      },
      rolesEfectivos: [resumenRol(analista)]
    };
  };

  const empleados = [];
  const solicitudes = [];
  for (let n = 1; n <= cantidad; n += 1) {
    const par = n % 2 === 0;
    const sufijo = String(n).padStart(5, "0");
    const legajo = `BEN-${sufijo}`;
    const rolPuesto = par ? rolAnalista : rolAprobador;
    const rolDirecto = par ? rolAuditor : rolConsultaFinanzas;
    const area = par ? areaTI : areaRRHH;
    const puesto = par ? puestoAnalista : puestoJefeRRHH;
    const personaSolicitante = personaEnSolicitud(n, par);
    const motivo = "Solicitud sintética para benchmark";

    empleados.push({
      replaceOne: {
        filter: { _id: `BEN-E-${sufijo}` },
        replacement: {
          _id: `BEN-E-${sufijo}`,
          legajo,
          nombre: "Empleado",
          apellido: `Benchmark ${sufijo}`,
          email: `benchmark${sufijo}@ejemplo.com`,
          area,
          puesto,
          fechaAlta: fecha,
          rolesDirectos: [
            {
              rol: rolDirecto,
              origen: "DIRECTO",
              motivo: "Asignación sintética para benchmark",
              asignadoPor: null,
              fechaInicio: fecha,
              fechaFin: null
            }
          ],
          activo: true
        },
        upsert: true
      }
    });

    const rolSolicitado = par ? rolAuditor : rolConsultaFinanzas;
    const aprobadorAsignado = {
      ...personaEnSolicitud(0, false),
      legajo: "2001",
      nombre: "Martín",
      apellido: "Gómez",
      email: "martin.gomez@ejemplo.com"
    };

    solicitudes.push({
      replaceOne: {
        filter: { _id: `BEN-S-${sufijo}` },
        replacement: {
          _id: `BEN-S-${sufijo}`,
          solicitante: personaSolicitante,
          rolSolicitado,
          rolAnterior: null,
          tipo: "ALTA",
          estado: "EN_APROBACION",
          motivo,
          fechaCreacion: fecha,
          fechaCierre: null,
          aprobaciones: [
            {
              numeroPaso: 1,
              rolAprobador: resumenRol(rolAprobador),
              aprobadorAsignado,
              aprobador: null,
              estado: "PENDIENTE",
              fechaAsignacion: fecha,
              fechaDecision: null,
              comentario: null
            }
          ],
          auditoria: []
        },
        upsert: true
      }
    });
  }

  for (let inicio = 0; inicio < cantidad; inicio += 500) {
    iam.empleados.bulkWrite(empleados.slice(inicio, inicio + 500), { ordered: true });
    iam.solicitudes.bulkWrite(solicitudes.slice(inicio, inicio + 500), { ordered: true });
  }

  print(`Empleados sintéticos listos: ${iam.empleados.countDocuments({ _id: /^BEN-E-/ })}`);
  print(`Solicitudes sintéticas listas: ${iam.solicitudes.countDocuments({ _id: /^BEN-S-/ })}`);
  print("Todos los catálogos, permisos, aprobaciones y datos de persona están embebidos.");
})();
