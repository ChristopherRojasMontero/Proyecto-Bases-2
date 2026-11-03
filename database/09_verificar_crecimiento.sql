-- 09_verificar_crecimiento.sql
-- Módulo 3: verifica que existan mediciones reales para demostrar el crecimiento
-- del almacenamiento. Ejecutar en SSMS con un usuario administrador, en la misma
-- instancia que se usará en la presentación (cada computadora tiene su propio historial).
--
-- PARTE 1: revisar el historial actual (solo lectura).
-- PARTE 2: registrar una medición en este momento.
-- PARTE 3 (opcional): generar actividad real en CineStream y volver a medir,
--          para que el historial muestre un cambio de tamaño.

USE CineStream;
GO

-- ===== PARTE 1: estado del historial =====

-- Cantidad de mediciones y periodo cubierto.
SELECT COUNT(DISTINCT fecha_medicion) AS mediciones,
       MIN(fecha_medicion) AS primera_medicion,
       MAX(fecha_medicion) AS ultima_medicion,
       DATEDIFF(MINUTE, MIN(fecha_medicion), MAX(fecha_medicion)) / 60.0 AS horas_cubiertas
FROM cineadmin.historial_almacenamiento;

-- Detalle por medición y variación respecto a la anterior.
WITH totales AS (
    SELECT fecha_medicion,
           SUM(tamano_mb) AS tamano_total_mb,
           SUM(CASE WHEN type_desc = 'ROWS' THEN usado_mb ELSE 0 END) AS datos_usado_mb,
           SUM(CASE WHEN type_desc = 'LOG' THEN usado_mb ELSE 0 END) AS log_usado_mb
    FROM cineadmin.historial_almacenamiento
    GROUP BY fecha_medicion
)
SELECT fecha_medicion, tamano_total_mb, datos_usado_mb, log_usado_mb,
       datos_usado_mb - LAG(datos_usado_mb) OVER (ORDER BY fecha_medicion) AS variacion_datos_mb
FROM totales
ORDER BY fecha_medicion;

-- Respaldos completos de CineStream (segunda fuente de crecimiento, msdb).
SELECT backup_finish_date AS fecha,
       CAST(backup_size / 1048576.0 AS DECIMAL(12,2)) AS tamano_respaldo_mb
FROM msdb.dbo.backupset
WHERE database_name = N'CineStream' AND type = 'D'
ORDER BY backup_finish_date;
GO

-- ===== PARTE 2: registrar una medición ahora =====
-- (Equivale al botón/endpoint POST /api/almacenamiento/crecimiento/registrar.)
EXEC cineadmin.sp_registrar_almacenamiento;
GO

-- ===== PARTE 3 (opcional): actividad real y nueva medición =====
-- Inserta 100.000 alquileres nuevos (unos 4-5 MB) con usuarios y películas
-- existentes y fechas del último mes. No modifica los datos anteriores.
-- Para usarla: seleccionar desde aquí hasta el final y ejecutar (F5).
/*
SET NOCOUNT ON;
DECLARE @filas INT = 100000;
DECLARE @usuarios INT = (SELECT COUNT(*) FROM dbo.usuarios);
DECLARE @peliculas INT = (SELECT COUNT(*) FROM dbo.peliculas);

WITH n AS (
    SELECT TOP (@filas) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS rn
    FROM sys.all_objects a CROSS JOIN sys.all_objects b
),
u AS (SELECT id_usuario, ROW_NUMBER() OVER (ORDER BY id_usuario) - 1 AS k FROM dbo.usuarios),
p AS (SELECT id_pelicula, precio_alquiler, ROW_NUMBER() OVER (ORDER BY id_pelicula) - 1 AS k FROM dbo.peliculas)
INSERT INTO dbo.alquileres (id_usuario, id_pelicula, fecha_alquiler, monto)
SELECT u.id_usuario, p.id_pelicula,
       DATEADD(MINUTE, -ABS(CHECKSUM(NEWID())) % 43200, GETDATE()),
       p.precio_alquiler
FROM n
JOIN u ON u.k = n.rn % @usuarios
JOIN p ON p.k = (n.rn * 7) % @peliculas;

SELECT COUNT(*) AS total_alquileres FROM dbo.alquileres;

EXEC cineadmin.sp_registrar_almacenamiento;
*/
GO
