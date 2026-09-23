-- 01_crear_bd.sql
-- Crea la base de datos CineStream (solo si no existe).
 
IF DB_ID(N'CineStream') IS NULL
BEGIN
    CREATE DATABASE CineStream;
END
GO