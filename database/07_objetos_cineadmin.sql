-- 07_objetos_cineadmin.sql
-- Crea los objetos propios de la herramienta CineAdmin dentro de CineStream:
--   - Esquema cineadmin (separado de los datos de negocio en dbo).
--   - Tabla historial_almacenamiento: mediciones de tamaño para el Módulo 3 (crecimiento).
--   - Tabla bitacora_mantenimiento: registro de cada acción del Módulo 6.
--   - Procedimientos que la API ejecuta para registrar el tamaño, actualizar
--     estadísticas, detectar objetos inválidos y recompilarlos.
--
-- Ejecutar con un usuario administrador (Windows Authentication / sa) DESPUÉS
-- del script 06. Es seguro ejecutarlo más de una vez (no borra el historial).
--
-- Seguridad: cine_app sigue sin poder modificar datos ni objetos directamente.
-- Solo recibe EXECUTE sobre el esquema cineadmin, es decir, puede ejecutar
-- únicamente estos procedimientos, que validan sus parámetros.

USE CineStream;
GO

IF SCHEMA_ID(N'cineadmin') IS NULL
    EXEC (N'CREATE SCHEMA cineadmin AUTHORIZATION dbo');
GO

IF OBJECT_ID(N'cineadmin.historial_almacenamiento', N'U') IS NULL
BEGIN
    CREATE TABLE cineadmin.historial_almacenamiento (
        id_medicion     INT IDENTITY(1,1) PRIMARY KEY,
        fecha_medicion  DATETIME2(0)   NOT NULL,
        archivo_logico  SYSNAME        NOT NULL,
        filegroup       SYSNAME        NULL,
        type_desc       NVARCHAR(60)   NOT NULL,
        tamano_mb       DECIMAL(12,2)  NOT NULL,
        usado_mb        DECIMAL(12,2)  NULL
    );
    CREATE INDEX IX_historial_almacenamiento_fecha
        ON cineadmin.historial_almacenamiento (fecha_medicion);
END
GO

IF OBJECT_ID(N'cineadmin.bitacora_mantenimiento', N'U') IS NULL
BEGIN
    CREATE TABLE cineadmin.bitacora_mantenimiento (
        id_bitacora     INT IDENTITY(1,1) PRIMARY KEY,
        fecha           DATETIME2(0)    NOT NULL DEFAULT SYSDATETIME(),
        operacion       NVARCHAR(40)    NOT NULL,
        objeto          NVARCHAR(300)   NULL,
        resultado       NVARCHAR(10)    NOT NULL,
        mensaje         NVARCHAR(2048)  NULL,
        duracion_ms     INT             NULL,
        ejecutado_por   SYSNAME         NOT NULL
    );
    CREATE INDEX IX_bitacora_mantenimiento_fecha
        ON cineadmin.bitacora_mantenimiento (fecha);
END
GO

-- Módulo 3: guarda una medición del tamaño de cada archivo de la base.
-- @horas_minimas: si ya existe una medición más reciente que esas horas, no
-- registra otra (lo usa el registro automático de la API). NULL = registrar siempre.
CREATE OR ALTER PROCEDURE cineadmin.sp_registrar_almacenamiento
    @horas_minimas INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @horas_minimas IS NOT NULL AND EXISTS (
        SELECT 1 FROM cineadmin.historial_almacenamiento
        WHERE fecha_medicion > DATEADD(HOUR, -@horas_minimas, SYSDATETIME()))
    BEGIN
        SELECT CAST(0 AS BIT) AS registrado, MAX(fecha_medicion) AS fecha_medicion
        FROM cineadmin.historial_almacenamiento;
        RETURN;
    END

    DECLARE @ahora DATETIME2(0) = SYSDATETIME();

    INSERT INTO cineadmin.historial_almacenamiento
        (fecha_medicion, archivo_logico, filegroup, type_desc, tamano_mb, usado_mb)
    SELECT @ahora, df.name, fg.name, df.type_desc,
           CAST(df.size / 128.0 AS DECIMAL(12,2)),
           CAST(FILEPROPERTY(df.name, 'SpaceUsed') / 128.0 AS DECIMAL(12,2))
    FROM sys.database_files df
    LEFT JOIN sys.filegroups fg ON fg.data_space_id = df.data_space_id;

    SELECT CAST(1 AS BIT) AS registrado, @ahora AS fecha_medicion;
END
GO

-- Módulo 6: actualiza estadísticas de una tabla o de todas las tablas de usuario.
-- @modo: 'MUESTREO' (rápido, muestra automática) o 'COMPLETO' (WITH FULLSCAN).
-- EXECUTE AS OWNER: UPDATE STATISTICS necesita ALTER sobre la tabla; el
-- procedimiento se ejecuta con los permisos de dbo, no con los de cine_app.
CREATE OR ALTER PROCEDURE cineadmin.sp_actualizar_estadisticas
    @esquema SYSNAME = NULL,
    @tabla   SYSNAME = NULL,
    @modo    NVARCHAR(10) = N'MUESTREO'
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    IF @modo NOT IN (N'MUESTREO', N'COMPLETO')
    BEGIN
        RAISERROR(N'Modo inválido. Use MUESTREO o COMPLETO.', 16, 1);
        RETURN;
    END

    IF @tabla IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE t.name = @tabla AND s.name = ISNULL(@esquema, N'dbo') AND t.is_ms_shipped = 0)
    BEGIN
        RAISERROR(N'La tabla indicada no existe en la base de datos.', 16, 1);
        RETURN;
    END

    DECLARE @resultados TABLE (
        tabla NVARCHAR(300), resultado NVARCHAR(10), mensaje NVARCHAR(2048),
        estadisticas INT, duracion_ms INT);

    DECLARE @nombre NVARCHAR(300), @object_id INT, @sql NVARCHAR(MAX),
            @inicio DATETIME2(3), @ms INT, @cantidad INT;

    DECLARE tablas CURSOR LOCAL FAST_FORWARD FOR
        SELECT QUOTENAME(s.name) + N'.' + QUOTENAME(t.name), t.object_id
        FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE t.is_ms_shipped = 0
          AND (@tabla IS NULL OR (t.name = @tabla AND s.name = ISNULL(@esquema, N'dbo')))
        ORDER BY s.name, t.name;

    OPEN tablas;
    FETCH NEXT FROM tablas INTO @nombre, @object_id;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @sql = N'UPDATE STATISTICS ' + @nombre
                 + CASE WHEN @modo = N'COMPLETO' THEN N' WITH FULLSCAN' ELSE N'' END + N';';
        SELECT @cantidad = COUNT(*) FROM sys.stats WHERE object_id = @object_id;
        SET @inicio = SYSDATETIME();
        BEGIN TRY
            EXEC sys.sp_executesql @sql;
            SET @ms = DATEDIFF(MILLISECOND, @inicio, SYSDATETIME());
            INSERT INTO @resultados VALUES (@nombre, N'OK', N'Estadísticas actualizadas (' + @modo + N').', @cantidad, @ms);
        END TRY
        BEGIN CATCH
            SET @ms = DATEDIFF(MILLISECOND, @inicio, SYSDATETIME());
            INSERT INTO @resultados VALUES (@nombre, N'ERROR', ERROR_MESSAGE(), @cantidad, @ms);
        END CATCH
        FETCH NEXT FROM tablas INTO @nombre, @object_id;
    END
    CLOSE tablas;
    DEALLOCATE tablas;

    INSERT INTO cineadmin.bitacora_mantenimiento (operacion, objeto, resultado, mensaje, duracion_ms, ejecutado_por)
    SELECT N'ACTUALIZAR_ESTADISTICAS', tabla, resultado, mensaje, duracion_ms, ORIGINAL_LOGIN()
    FROM @resultados;

    SELECT tabla, resultado, mensaje, estadisticas, duracion_ms FROM @resultados ORDER BY tabla;
END
GO

-- Módulo 6: detecta procedimientos, vistas, funciones y triggers que no compilan.
-- SQL Server no tiene un estado INVALID como Oracle, así que se usan dos pruebas:
--   1. REFERENCIA_INEXISTENTE: el módulo menciona un objeto que ya no existe
--      (sys.sql_expression_dependencies sin referenced_id).
--   2. ERROR_COMPILACION: se intenta revalidar el módulo con sp_refreshsqlmodule
--      dentro de una transacción que siempre se revierte (no cambia nada).
-- No revisa el esquema cineadmin (objetos de la propia herramienta).
CREATE OR ALTER PROCEDURE cineadmin.sp_detectar_objetos_invalidos
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @resultado TABLE (
        esquema SYSNAME, objeto SYSNAME, tipo NVARCHAR(60),
        problema NVARCHAR(30), detalle NVARCHAR(2048));

    INSERT INTO @resultado
    SELECT DISTINCT s.name, o.name, o.type_desc, N'REFERENCIA_INEXISTENTE',
           N'Hace referencia a ' + ISNULL(d.referenced_schema_name + N'.', N'')
           + d.referenced_entity_name + N', que no existe en la base de datos.'
    FROM sys.sql_expression_dependencies d
    JOIN sys.objects o ON o.object_id = d.referencing_id
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    WHERE o.is_ms_shipped = 0
      AND s.name <> N'cineadmin'
      AND d.referenced_class = 1
      AND d.referenced_id IS NULL
      AND d.referenced_server_name IS NULL
      AND d.referenced_database_name IS NULL
      AND d.is_ambiguous = 0
      AND d.referenced_entity_name NOT LIKE N'#%'
      AND OBJECT_ID(QUOTENAME(ISNULL(d.referenced_schema_name, s.name)) + N'.' + QUOTENAME(d.referenced_entity_name)) IS NULL
      AND OBJECT_ID(QUOTENAME(ISNULL(d.referenced_schema_name, N'dbo')) + N'.' + QUOTENAME(d.referenced_entity_name)) IS NULL
      AND TYPE_ID(QUOTENAME(ISNULL(d.referenced_schema_name, N'dbo')) + N'.' + QUOTENAME(d.referenced_entity_name)) IS NULL;

    DECLARE @esquema SYSNAME, @objeto SYSNAME, @tipo NVARCHAR(60), @nombre NVARCHAR(300);

    DECLARE modulos CURSOR LOCAL FAST_FORWARD FOR
        SELECT s.name, o.name, o.type_desc, QUOTENAME(s.name) + N'.' + QUOTENAME(o.name)
        FROM sys.objects o
        JOIN sys.schemas s ON s.schema_id = o.schema_id
        JOIN sys.sql_modules m ON m.object_id = o.object_id
        WHERE o.is_ms_shipped = 0
          AND s.name <> N'cineadmin'
          AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR')
          AND m.is_schema_bound = 0
        ORDER BY s.name, o.name;

    OPEN modulos;
    FETCH NEXT FROM modulos INTO @esquema, @objeto, @tipo, @nombre;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;
            EXEC sys.sp_refreshsqlmodule @name = @nombre;
            ROLLBACK TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            INSERT INTO @resultado VALUES (@esquema, @objeto, @tipo, N'ERROR_COMPILACION', ERROR_MESSAGE());
        END CATCH
        FETCH NEXT FROM modulos INTO @esquema, @objeto, @tipo, @nombre;
    END
    CLOSE modulos;
    DEALLOCATE modulos;

    SELECT esquema, objeto, tipo, problema, detalle
    FROM @resultado
    ORDER BY esquema, objeto, problema;
END
GO

-- Módulo 6: recompila un objeto (equivalente en SQL Server a ALTER ... COMPILE de Oracle).
--   sp_refreshsqlmodule: vuelve a validar el módulo contra las tablas actuales
--                        (falla si el objeto sigue con errores).
--   sp_recompile:        marca el objeto para que su plan se recompile en la siguiente ejecución.
-- Devuelve OK o ERROR con el mensaje de SQL Server y lo registra en la bitácora.
CREATE OR ALTER PROCEDURE cineadmin.sp_recompilar_objeto
    @esquema SYSNAME,
    @objeto  SYSNAME
WITH EXECUTE AS OWNER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @nombre NVARCHAR(300) = QUOTENAME(@esquema) + N'.' + QUOTENAME(@objeto),
            @tipo CHAR(2), @schema_bound BIT,
            @inicio DATETIME2(3) = SYSDATETIME(),
            @resultado NVARCHAR(10), @mensaje NVARCHAR(2048), @ms INT;

    SELECT @tipo = o.type, @schema_bound = m.is_schema_bound
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    JOIN sys.sql_modules m ON m.object_id = o.object_id
    WHERE s.name = @esquema AND o.name = @objeto AND o.is_ms_shipped = 0
      AND o.type IN ('P', 'V', 'FN', 'IF', 'TF', 'TR');

    IF @tipo IS NULL
    BEGIN
        SET @resultado = N'ERROR';
        SET @mensaje = N'El objeto no existe o no es un procedimiento, vista, función o trigger.';
    END
    ELSE
    BEGIN
        BEGIN TRY
            IF @schema_bound = 0
                EXEC sys.sp_refreshsqlmodule @name = @nombre;
            EXEC sys.sp_recompile @objname = @nombre;
            SET @resultado = N'OK';
            SET @mensaje = N'Objeto revalidado y marcado para recompilación.';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SET @resultado = N'ERROR';
            SET @mensaje = ERROR_MESSAGE();
        END CATCH
    END

    SET @ms = DATEDIFF(MILLISECOND, @inicio, SYSDATETIME());

    INSERT INTO cineadmin.bitacora_mantenimiento (operacion, objeto, resultado, mensaje, duracion_ms, ejecutado_por)
    VALUES (N'RECOMPILAR_OBJETO', @nombre, @resultado, @mensaje, @ms, ORIGINAL_LOGIN());

    SELECT @nombre AS objeto, @resultado AS resultado, @mensaje AS mensaje, @ms AS duracion_ms;
END
GO

-- Permisos de la aplicación: solo ejecutar estos procedimientos y leer sus tablas.
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'cine_app')
BEGIN
    GRANT EXECUTE ON SCHEMA::cineadmin TO cine_app;
    GRANT SELECT  ON SCHEMA::cineadmin TO cine_app;
END
GO

-- Primera medición del tamaño, para que el historial no empiece vacío.
EXEC cineadmin.sp_registrar_almacenamiento;
GO
