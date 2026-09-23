-- 05_seed_resenas.sql
-- Genera 15.000 reseñas aleatorias. Ejecutar UNA sola vez.

USE CineStream;
GO

SET NOCOUNT ON;

DECLARE @i INT = 0;

WHILE @i < 15000
BEGIN
    INSERT INTO resenas (id_usuario, id_pelicula, calificacion, comentario, fecha)
    SELECT
        u.id_usuario,
        p.id_pelicula,
        1 + ABS(CHECKSUM(NEWID())) % 5,
        CHOOSE(1 + ABS(CHECKSUM(NEWID())) % 5,
            N'Excelente película, la recomiendo.',
            N'Muy buena, se me pasó volando.',
            N'Regular, esperaba más.',
            N'No me gustó mucho.',
            N'Una obra maestra.'),
        DATEADD(MINUTE, -ABS(CHECKSUM(NEWID())) % 1051200, GETDATE())
    FROM (SELECT TOP 1 id_usuario FROM usuarios ORDER BY NEWID()) u
    CROSS JOIN (SELECT TOP 1 id_pelicula FROM peliculas ORDER BY NEWID()) p;

    SET @i += 1;
END;
GO

-- Verificación (esperado: 15000)
SELECT COUNT(*) AS total_resenas FROM resenas;
GO