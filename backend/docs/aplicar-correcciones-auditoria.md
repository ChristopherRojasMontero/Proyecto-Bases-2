# Aplicación manual de correcciones SQL (AUD-003 y AUD-004)

Estos cambios están preparados en `database/07_objetos_cineadmin.sql` y no se
aplican automáticamente al iniciar la API. No requieren cambiar datos históricos,
propietarios ni permisos.

En SSMS, conectado como administrador a la instancia de trabajo:

1. Seleccionar `CineStream` como base activa (`USE CineStream; GO`).
2. En el script 07 actualizado, seleccionar únicamente el bloque completo
   `CREATE OR ALTER PROCEDURE cineadmin.sp_detectar_objetos_invalidos`, desde
   su declaración hasta su `END` y el `GO` que le sigue. Aplicarlo manualmente.
3. Seleccionar y aplicar únicamente el bloque completo
   `CREATE OR ALTER PROCEDURE cineadmin.sp_recompilar_objeto`, con su `GO` final.
4. No ejecutar todo el script: incluye permisos y una medición inicial fuera
   del alcance de esta corrección.

La detección pasa a consultar catálogos y `sys.dm_sql_referenced_entities`. No usa
`sp_refreshsqlmodule`. La revalidación rechaza objetos con registros de firma en
`sys.crypt_properties` antes de refrescarlos y conserva el resultado en bitácora.

Antes de aplicar, revisar si los propios procedimientos `cineadmin` tienen firmas:
`CREATE OR ALTER` también requiere gestionar esas firmas por separado. En la
auditoría no había firmas instaladas; se debe verificar de nuevo al aplicar.

Verificación posterior exclusivamente de lectura:

```sql
USE CineStream;
GO
SELECT o.name, m.definition
FROM sys.sql_modules AS m
JOIN sys.objects AS o ON o.object_id = m.object_id
WHERE o.schema_id = SCHEMA_ID(N'cineadmin')
  AND o.name IN (N'sp_detectar_objetos_invalidos', N'sp_recompilar_objeto');
```

No ejecutar recompilaciones ni mantenimiento como prueba sin autorización. El
GET de la API ya usa su diagnóstico directo y la acción POST ya tiene una
comprobación preventiva de firmas; actualizar SQL protege también el uso directo
del procedimiento y evita depender únicamente de esa comprobación previa.

## Cambios transversales del módulo 5

No se modificaron `routes/auditoria.js` ni `queries/auditoria.js`. La conexión
compartida interpreta fechas históricas en `DB_TIMEZONE` (Costa Rica por defecto).
El frontend conserva usuarios, roles, privilegios, advertencias y cobertura, con
errores por sección y protección frente a respuestas antiguas.
