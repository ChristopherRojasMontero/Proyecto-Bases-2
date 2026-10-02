-- 06_crear_usuario_app.sql
-- Crea el usuario que usará la aplicación (Node.js) para monitorear la instancia.
-- Solo LECTURA y monitoreo: no puede modificar datos.
--
-- ANTES DE EJECUTAR: cambiar la contraseña de abajo por una propia
-- (la misma que luego se pondrá en el archivo .env local, NUNCA en Git).
-- Requiere que la base CineStream ya exista (scripts 01 y 02).
-- Es seguro ejecutarlo más de una vez.

USE master;
GO

-- 1. Login a nivel de servidor
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'cine_app')
BEGIN
    CREATE LOGIN cine_app WITH PASSWORD = N'CambiarEstaClave123!',
        CHECK_POLICY = OFF, DEFAULT_DATABASE = CineStream;
END
GO

-- 2. Permisos de monitoreo a nivel de servidor (DMVs y catálogos)
GRANT VIEW SERVER STATE   TO cine_app;
GRANT VIEW ANY DEFINITION TO cine_app;
GRANT VIEW ANY DATABASE   TO cine_app;
GO

-- 3. Acceso a CineStream
USE CineStream;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'cine_app')
    CREATE USER cine_app FOR LOGIN cine_app;
ALTER ROLE db_datareader ADD MEMBER cine_app;
GRANT VIEW DATABASE STATE TO cine_app;
GRANT VIEW DEFINITION     TO cine_app;
GO

-- 4. Acceso de lectura a msdb (historial de respaldos, Módulo 4)
USE msdb;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'cine_app')
    CREATE USER cine_app FOR LOGIN cine_app;
ALTER ROLE db_datareader ADD MEMBER cine_app;
GO