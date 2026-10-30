/*
  Estas consultas son de solo lectura.
  Consultan el historial administrativo de respaldos registrado
  por SQL Server en la base de sistema msdb.
*/

USE msdb;
GO

-- 1. Historial de respaldos completados de CineStream
SELECT TOP (50)
    backup_set_id AS id_respaldo,
    database_name AS base_de_datos,
    CASE type
        WHEN 'D' THEN 'Completo'
        WHEN 'I' THEN 'Diferencial'
        WHEN 'L' THEN 'Log de transacciones'
        ELSE 'Otro'
    END AS tipo_respaldo,
    backup_start_date AS fecha_inicio,
    backup_finish_date AS fecha_fin,
    CAST(backup_size / 1048576.0 AS DECIMAL(12, 2))
        AS tamano_mb,
    DATEDIFF(
        SECOND,
        backup_start_date,
        backup_finish_date
    ) AS duracion_segundos
FROM dbo.backupset
WHERE database_name = N'CineStream'
  AND backup_finish_date IS NOT NULL
ORDER BY backup_start_date DESC, backup_set_id DESC;
GO

-- 2. Último respaldo completado de CineStream
SELECT TOP (1)
    database_name AS base_de_datos,
    CASE type
        WHEN 'D' THEN 'Completo'
        WHEN 'I' THEN 'Diferencial'
        WHEN 'L' THEN 'Log de transacciones'
        ELSE 'Otro'
    END AS tipo_respaldo,
    backup_start_date AS fecha_inicio,
    backup_finish_date AS fecha_fin,
    CAST(backup_size / 1048576.0 AS DECIMAL(12, 2))
        AS tamano_mb
FROM dbo.backupset
WHERE database_name = N'CineStream'
  AND backup_finish_date IS NOT NULL
ORDER BY backup_start_date DESC, backup_set_id DESC;
GO

-- 3. Destinos registrados para los respaldos
SELECT
    bs.backup_set_id AS id_respaldo,
    bs.database_name AS base_de_datos,
    bs.backup_finish_date AS fecha_fin,
    bmf.physical_device_name AS destino
FROM dbo.backupset AS bs
INNER JOIN dbo.backupmediafamily AS bmf
    ON bmf.media_set_id = bs.media_set_id
WHERE bs.database_name = N'CineStream'
  AND bs.backup_finish_date IS NOT NULL
ORDER BY bs.backup_start_date DESC, bs.backup_set_id DESC;
GO

