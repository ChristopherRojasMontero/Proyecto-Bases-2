// Módulo 5 — consultas de lectura; la conexión pertenece a db.js.
const { sql, getPool } = require('../db');

const tiposUsuario = "('S', 'U', 'G', 'E', 'X', 'C', 'K')";
const usuariosSQL = `
  SELECT principal_id AS usuario_id, name AS nombre, type_desc AS tipo,
         authentication_type_desc AS autenticacion,
         default_schema_name AS esquema_predeterminado,
         create_date AS fecha_creacion, modify_date AS fecha_modificacion
  FROM sys.database_principals
  WHERE type IN ${tiposUsuario} AND (@usuario_id IS NULL OR principal_id = @usuario_id)
  ORDER BY name;`;

async function contexto(seguridad = false) {
  const pool = await getPool();
  // Evita interpretar metadatos ocultos como ausencia de usuarios u objetos.
  const result = await pool.request().query(`
    SELECT DB_NAME() AS base_de_datos,
      HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'VIEW DEFINITION') AS ver_definicion,
      HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'VIEW SECURITY DEFINITION') AS ver_seguridad;`);
  const info = result.recordset[0];
  if (!info || info.ver_definicion !== 1 || (seguridad && info.ver_seguridad !== 1)) {
    const error = new Error('Metadatos administrativos no visibles.');
    error.number = 51005;
    throw error;
  }
  return { pool, base_de_datos: info.base_de_datos };
}

async function obtenerUsuarios() {
  const { pool, base_de_datos } = await contexto();
  const result = await pool.request().input('usuario_id', sql.Int, null).query(usuariosSQL);
  return { base_de_datos, datos: result.recordset, advertencias: [] };
}

async function leerRoles(pool) {
  const result = await pool.request().query(`
    SELECT r.principal_id AS rol_id, r.name AS nombre, r.type_desc AS tipo,
           r.is_fixed_role AS es_fijo,
           p.name AS propietario, m.principal_id AS miembro_id,
           m.name AS miembro_nombre, m.type_desc AS miembro_tipo
    FROM sys.database_principals r
    LEFT JOIN sys.database_principals p ON p.principal_id = r.owning_principal_id
    LEFT JOIN sys.database_role_members rm ON rm.role_principal_id = r.principal_id
    LEFT JOIN sys.database_principals m ON m.principal_id = rm.member_principal_id
    WHERE r.type IN ('R', 'A')
    ORDER BY r.name, m.name;`);
  const roles = new Map();
  for (const fila of result.recordset) {
    if (!roles.has(fila.rol_id)) {
      roles.set(fila.rol_id, {
        rol_id: fila.rol_id, nombre: fila.nombre, es_fijo: Boolean(fila.es_fijo),
        tipo: fila.tipo, es_rol_aplicacion: fila.tipo === 'APPLICATION_ROLE',
        propietario: fila.propietario, membresia_implicita: fila.nombre === 'public', miembros: [],
      });
    }
    if (fila.miembro_id !== null) {
      roles.get(fila.rol_id).miembros.push({
        principal_id: fila.miembro_id, nombre: fila.miembro_nombre, tipo: fila.miembro_tipo,
      });
    }
  }
  return [...roles.values()];
}

async function obtenerRoles() {
  const { pool, base_de_datos } = await contexto();
  return { base_de_datos, datos: await leerRoles(pool), advertencias: [
    'public incluye implícitamente a todos los usuarios; sus miembros no aparecen como asignaciones explícitas.',
  ] };
}

async function obtenerPrivilegios(usuarioId = null) {
  const { pool, base_de_datos } = await contexto(true);
  const usuarios = (await pool.request().input('usuario_id', sql.Int, usuarioId).query(usuariosSQL)).recordset;
  if (usuarioId !== null && usuarios.length === 0) {
    const error = new Error('Usuario administrativo inexistente.');
    error.status = 404;
    throw error;
  }
  const roles = await leerRoles(pool);
  const permisos = (await pool.request().query(`
    SELECT p.grantee_principal_id AS principal_id, g.name AS otorgado_a,
           a.name AS otorgante, p.permission_name AS permiso, p.state_desc AS estado,
           p.class AS clase_id, p.class_desc AS clase, p.major_id, p.minor_id,
           CASE p.class
             WHEN 0 THEN DB_NAME()
             WHEN 1 THEN COALESCE(QUOTENAME(s.name) + '.' + QUOTENAME(o.name),
                         QUOTENAME(OBJECT_SCHEMA_NAME(p.major_id)) + '.' + QUOTENAME(OBJECT_NAME(p.major_id)))
             WHEN 3 THEN QUOTENAME(es.name)
             WHEN 4 THEN QUOTENAME(dp.name)
           END AS recurso,
           c.name AS columna
    FROM sys.database_permissions p
    JOIN sys.database_principals g ON g.principal_id = p.grantee_principal_id
    LEFT JOIN sys.database_principals a ON a.principal_id = p.grantor_principal_id
    LEFT JOIN sys.all_objects o ON p.class = 1 AND o.object_id = p.major_id
    LEFT JOIN sys.schemas s ON s.schema_id = o.schema_id
    LEFT JOIN sys.all_columns c ON p.class = 1 AND c.object_id = p.major_id AND c.column_id = p.minor_id
    LEFT JOIN sys.schemas es ON p.class = 3 AND es.schema_id = p.major_id
    LEFT JOIN sys.database_principals dp ON p.class = 4 AND dp.principal_id = p.major_id
    ORDER BY g.name, p.class, p.major_id, p.minor_id, p.permission_name;`)).recordset;
  const datos = [];
  const rolesFijos = [];
  const principalesAlcanzados = new Set();
  for (const usuario of usuarios) {
    const pendientes = [{ id: usuario.usuario_id, ruta: [] }];
    const publico = roles.find((rol) => rol.nombre === 'public');
    if (publico) pendientes.push({ id: publico.rol_id, ruta: ['public'] });
    // Conserva una ruta representativa por principal y evita ciclos/repeticiones.
    const visitados = new Set();
    for (let i = 0; i < pendientes.length; i++) {
      const actual = pendientes[i];
      if (visitados.has(actual.id)) continue;
      visitados.add(actual.id);
      principalesAlcanzados.add(actual.id);
      const rolActual = roles.find((rol) => rol.rol_id === actual.id);
      if (rolActual && rolActual.es_fijo) {
        rolesFijos.push({ usuario_id: usuario.usuario_id, beneficiario: usuario.nombre,
          rol: rolActual.nombre, ruta_roles: actual.ruta });
      }
      for (const permiso of permisos.filter((p) => p.principal_id === actual.id)) {
        datos.push({ usuario_id: usuario.usuario_id, beneficiario: usuario.nombre,
          origen: actual.ruta.length ? (actual.ruta[0] === 'public' ? 'PUBLIC' : 'ROL') : 'DIRECTO',
          ruta_roles: actual.ruta, ...permiso });
      }
      for (const rol of roles) {
        if (rol.miembros.some((m) => m.principal_id === actual.id)) {
          pendientes.push({ id: rol.rol_id, ruta: [...actual.ruta, rol.nombre] });
        }
      }
    }
  }
  // Sin filtro, conserva también asignaciones a roles vacíos u otros principales.
  // No se atribuyen a un usuario que no ha sido alcanzado por una membresía.
  if (usuarioId === null) {
    for (const permiso of permisos) {
      if (!principalesAlcanzados.has(permiso.principal_id)) {
        datos.push({ usuario_id: null, beneficiario: null, origen: 'SIN_BENEFICIARIO',
          ruta_roles: [], ...permiso });
      }
    }
  }
  return { base_de_datos, datos, roles_fijos: rolesFijos, advertencias: [
    'Inventario de asignaciones, no cálculo de permisos efectivos. Se preservan DENY, GRANT, GRANT_WITH_GRANT_OPTION y REVOKE.',
    'Los permisos implícitos de roles fijos no figuran en sys.database_permissions; consultar roles_fijos.',
    'No se expanden grupos Windows/externos, permisos de servidor, propiedad ni cadenas de propiedad. Se muestra una ruta por principal.',
    'SIN_BENEFICIARIO indica una asignación explícita sin usuario alcanzable en este inventario; no implica ausencia de acceso efectivo.',
  ] };
}

function numerosSQL(error) {
  return [error, ...(error.precedingErrors || [])]
    .map((e) => e.number || (e.originalError && e.originalError.info && e.originalError.info.number))
    .filter(Number.isInteger);
}

async function obtenerObjetosProblematicos() {
  const { pool, base_de_datos } = await contexto();
  const objetos = (await pool.request().query(`
    SELECT o.object_id, s.name AS esquema, o.name AS objeto, o.type_desc AS tipo,
           QUOTENAME(s.name) + '.' + QUOTENAME(o.name) AS nombre_calificado,
           CASE WHEN m.definition IS NULL THEN 0 ELSE 1 END AS definicion_visible
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    LEFT JOIN sys.sql_modules m ON m.object_id = o.object_id
    WHERE o.is_ms_shipped = 0 AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR')
    ORDER BY s.name, o.name;`)).recordset;
  const dependencias = (await pool.request().query(`
    SELECT d.referencing_id, d.referenced_server_name AS servidor,
           d.referenced_database_name AS base_referenciada,
           d.referenced_schema_name AS esquema_referenciado,
           d.referenced_entity_name AS entidad_referenciada,
           d.is_caller_dependent, d.is_ambiguous
    FROM sys.sql_expression_dependencies d
    JOIN sys.objects o ON o.object_id = d.referencing_id
    WHERE o.is_ms_shipped = 0 AND d.referenced_class = 1
      AND (d.referenced_id IS NULL OR d.is_ambiguous = 1);`)).recordset;
  const datos = [];
  let revisados = 0;
  let noEvaluables = 0;
  for (const objeto of objetos) {
    const identidad = { objeto_id: objeto.object_id, esquema: objeto.esquema,
      objeto: objeto.objeto, tipo: objeto.tipo };
    for (const dependencia of dependencias.filter((d) => d.referencing_id === objeto.object_id)) {
      const { referencing_id, ...referencia } = dependencia;
      const tiposReferencia = [];
      if (referencia.servidor !== null || referencia.base_referenciada !== null) tiposReferencia.push('EXTERNA');
      if (referencia.is_ambiguous) tiposReferencia.push('AMBIGUA');
      if (referencia.is_caller_dependent) tiposReferencia.push('DEPENDIENTE_LLAMADOR');
      if (!tiposReferencia.length) tiposReferencia.push('LOCAL_NO_RESUELTA');
      datos.push({ ...identidad, categoria: 'POSIBLE_PROBLEMA',
        codigo: 'REFERENCIA_NO_RESUELTA_O_AMBIGUA', tipos_referencia: tiposReferencia, referencia,
        mensaje: 'Requiere revisión; puede ser una referencia externa, ambigua o dependiente del llamador.' });
    }
    if (!objeto.definicion_visible) {
      noEvaluables++;
      datos.push({ ...identidad, categoria: 'NO_EVALUABLE', codigo: 'DEFINICION_NO_VISIBLE',
        mensaje: 'Definición no disponible; puede estar cifrada o restringida.' });
      continue;
    }
    try {
      const result = await pool.request().input('objeto', sql.NVarChar(517), objeto.nombre_calificado).query(`
        SELECT referenced_schema_name, referenced_entity_name, referenced_minor_name,
               is_all_columns_found, is_incomplete
        FROM sys.dm_sql_referenced_entities(@objeto, 'OBJECT');`);
      revisados++;
      for (const fila of result.recordset) {
        if (fila.is_incomplete || fila.is_all_columns_found === false || fila.is_all_columns_found === 0) {
          datos.push({ ...identidad,
            categoria: fila.is_incomplete ? 'ERROR_CONFIRMADO' : 'POSIBLE_PROBLEMA',
            codigo: fila.is_incomplete ? 'ERROR_ENLACE' : 'DEPENDENCIAS_INCOMPLETAS',
            referencia: fila, mensaje: 'Diagnóstico de enlace de SQL Server; no prueba de ejecución del módulo.' });
        }
      }
    } catch (error) {
      const numeros = numerosSQL(error);
      const conocidos = [2020, 207, 208, 209, 4104, 4121, 4413, 4512, 4513];
      // Lista conservadora de errores de evaluación del objeto. No absorbe
      // errores desconocidos, de permisos, recursos, conexión o timeout.
      const erroresNoEvaluables = [4502, 4514, 11514, 11526];
      if (error.code !== 'EREQUEST' || !numeros.length
          || numeros.some((n) => !conocidos.includes(n) && !erroresNoEvaluables.includes(n))
          || [error, ...(error.precedingErrors || [])].some((e) => e.class >= 20)) throw error;
      if (numeros.some((n) => erroresNoEvaluables.includes(n))) {
        // El objeto no se cuenta como revisado si la evaluación no pudo completarse.
        datos.push({ ...identidad, categoria: 'NO_EVALUABLE', codigo: 'ERROR_EVALUACION',
          numero_error: numeros.find((n) => erroresNoEvaluables.includes(n)),
          mensaje: 'SQL Server no pudo evaluar los metadatos del objeto.' });
        noEvaluables++;
        continue;
      }
      revisados++;
      const confirmado = numeros.find((n) => n !== 2020);
      datos.push({ ...identidad,
        categoria: confirmado ? 'ERROR_CONFIRMADO' : 'POSIBLE_PROBLEMA',
        codigo: confirmado ? 'ERROR_ENLACE' : 'DEPENDENCIAS_INCOMPLETAS',
        numero_error: confirmado || 2020,
        mensaje: confirmado ? 'SQL Server informó un error al enlazar las referencias del objeto.'
          : 'SQL Server no pudo determinar todas las dependencias de columnas (2020).' });
    }
  }
  return { base_de_datos, datos,
    cobertura: { objetos_inventariados: objetos.length, objetos_revisados: revisados,
      objetos_no_evaluables: noEvaluables },
    advertencias: [
      'SQL Server no dispone de un estado INVALID universal. Los errores confirmados corresponden al enlace observado.',
      'Cobertura: procedimientos, vistas, funciones T-SQL y triggers DML. No incluye SQL dinámico, CLR, sinónimos ni triggers DDL.',
      'Las referencias externas no se verifican. Sin hallazgos no garantiza ausencia de errores de ejecución.',
    ] };
}

module.exports = { obtenerUsuarios, obtenerRoles, obtenerPrivilegios, obtenerObjetosProblematicos, numerosSQL };
