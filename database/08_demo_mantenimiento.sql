-- 08_demo_mantenimiento.sql
-- OPCIONAL: prepara objetos reales para demostrar el Módulo 6 en la presentación.
-- No inserta datos de negocio ni simula resultados: crea una tabla, una vista y
-- un procedimiento, y luego cambia la tabla para que SQL Server reporte errores
-- reales de compilación.
--
-- Ejecutar con un usuario administrador, después del script 07.
--
-- Flujo sugerido en la demo:
--   1. Ejecutar la PARTE 1 de este script.
--   2. CineAdmin > Mantenimiento > "Detectar objetos inválidos"
--      -> aparecen dbo.v_demo_promociones y dbo.sp_demo_reporte_promociones.
--   3. "Recompilar" uno de ellos -> resultado ERROR (sigue roto).
--   4. Ejecutar la PARTE 2 (corrige la tabla).
--   5. "Recompilar" de nuevo -> resultado OK. Volver a detectar -> lista vacía.
--   6. Al terminar, ejecutar la PARTE 3 para borrar los objetos de demostración.

USE CineStream;
GO

-- ===== PARTE 1: crear objetos y romperlos =====
IF OBJECT_ID(N'dbo.sp_demo_reporte_promociones', N'P') IS NOT NULL DROP PROCEDURE dbo.sp_demo_reporte_promociones;
IF OBJECT_ID(N'dbo.v_demo_promociones', N'V') IS NOT NULL DROP VIEW dbo.v_demo_promociones;
IF OBJECT_ID(N'dbo.demo_promociones', N'U') IS NOT NULL DROP TABLE dbo.demo_promociones;
GO

CREATE TABLE dbo.demo_promociones (
    id_promocion INT PRIMARY KEY,
    id_pelicula  INT NOT NULL REFERENCES dbo.peliculas(id_pelicula),
    descuento    DECIMAL(5,2) NOT NULL
);
GO

CREATE VIEW dbo.v_demo_promociones AS
SELECT p.titulo, d.descuento
FROM dbo.demo_promociones d
JOIN dbo.peliculas p ON p.id_pelicula = d.id_pelicula;
GO

CREATE PROCEDURE dbo.sp_demo_reporte_promociones AS
SELECT id_pelicula, descuento FROM dbo.demo_promociones ORDER BY descuento DESC;
GO

-- Cambio de estructura: la columna "descuento" pasa a llamarse "porcentaje".
-- La vista y el procedimiento siguen apuntando a "descuento" y quedan inválidos.
EXEC sp_rename N'dbo.demo_promociones.descuento', N'porcentaje', N'COLUMN';
GO

-- ===== PARTE 2: corregir (seleccionar solo estas líneas y ejecutar) =====
-- EXEC sp_rename N'dbo.demo_promociones.porcentaje', N'descuento', N'COLUMN';

-- ===== PARTE 3: limpiar (seleccionar solo estas líneas y ejecutar) =====
-- DROP PROCEDURE IF EXISTS dbo.sp_demo_reporte_promociones;
-- DROP VIEW IF EXISTS dbo.v_demo_promociones;
-- DROP TABLE IF EXISTS dbo.demo_promociones;
