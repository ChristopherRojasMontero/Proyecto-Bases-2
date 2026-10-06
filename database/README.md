# Base de datos CineStream

Scripts para crear la base de datos temática de CineStream en **SQL Server**.

## Requisitos

- SQL Server (Express, Developer o superior) instalado y en ejecución.
- SQL Server Management Studio (SSMS) u otra herramienta para ejecutar scripts.

## Instalación

Ejecutar los scripts **en orden numérico** desde SSMS (abrir el archivo → F5):

| Orden | Archivo                  | Qué hace                                         | Resultado esperado          |
|-------|--------------------------|--------------------------------------------------|-----------------------------|
| 1     | `01_crear_bd.sql`        | Crea la base de datos `CineStream`               | Commands completed          |
| 2     | `02_crear_tablas.sql`    | Crea las 7 tablas                                | 7 tablas en `dbo`           |
| 3     | `03_seed_catalogos.sql`  | Géneros, actores, películas, usuarios            | 8, 10, 15, 25, 10           |
| 4     | `04_seed_alquileres.sql` | Genera 50.000 alquileres (tarda ~1-2 min)        | 50000                       |
| 5     | `05_seed_resenas.sql`    | Genera 15.000 reseñas                            | 15000                       |

## Notas

- Ejecutar cada script **una sola vez**. Para empezar de cero: `DROP DATABASE CineStream;` y repetir los pasos.
- Los alquileres y reseñas son **aleatorios**: cada instancia tendrá el mismo volumen, pero no filas idénticas.
- Si se abren los archivos en un editor que no sea SSMS, usar codificación **UTF-8** para que se vean bien las tildes.
