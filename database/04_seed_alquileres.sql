-- 04_seed_alquileres.sql
-- Genera 50.000 alquileres aleatorios (últimos ~2 años).
-- Puede tardar entre 30 segundos y unos minutos. Ejecutar UNA sola vez.

USE CineStream;
GO

SET NOCOUNT ON;

DECLARE @i INT = 0;

WHILE @i < 50000
BEGIN
    INSERT INTO alquileres (id_usuario, id_pelicula, fecha_alquiler, monto)
    SELECT
        u.id_usuario,
        p.id_pelicula,
        DATEADD(MINUTE, -ABS(CHECKSUM(NEWID())) % 1051200, GETDATE()),  -- últimos ~2 años
        p.precio_alquiler
    FROM (SELECT TOP 1 id_usuario FROM usuarios ORDER BY NEWID()) u
    CROSS JOIN (SELECT TOP 1 id_pelicula, precio_alquiler FROM peliculas ORDER BY NEWID()) p;

    SET @i += 1;
END;
GO

-- Verificación (esperado: 50000)
SELECT COUNT(*) AS total_alquileres FROM alquileres;
GO