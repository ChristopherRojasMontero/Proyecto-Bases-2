# Base de datos CineStream

Scripts y guía para dejar una instancia de **SQL Server** lista para el proyecto CineStream / CineAdmin.

## Requisitos

- SQL Server 2022 (Express o Developer) instalado y en ejecución.
- SQL Server Management Studio (SSMS).
- Node.js (para la aplicación; se usa en pasos posteriores).

---

## Parte A. Configurar la instancia (una sola vez por computadora)

Estos pasos se hacen con las herramientas gráficas, no con scripts. Los ejemplos asumen una instancia llamada `SQLEXPRESS`.

### A1. Habilitar TCP/IP y fijar el puerto 1433

1. Abrir **SQL Server 2022 Configuration Manager** (o `Windows + R` → `SQLServerManager16.msc`).
2. **SQL Server Network Configuration → Protocols for SQLEXPRESS**.
3. Click derecho en **TCP/IP → Enable**.
4. Doble click en **TCP/IP → pestaña IP Addresses**, ir hasta la sección **IPAll**:
   - **TCP Dynamic Ports:** vacío
   - **TCP Port:** `1433`
5. Aceptar (el reinicio se hace después del paso A2).

### A2. Activar el modo mixto de autenticación

1. En SSMS, conectarse a `.\SQLEXPRESS` con Windows Authentication.
2. Click derecho sobre el servidor → **Propiedades → Seguridad**.
3. Elegir **Modo de autenticación de SQL Server y de Windows** y aceptar.

### A3. Reiniciar el servicio

En Configuration Manager: **SQL Server Services → SQL Server (SQLEXPRESS) → Restart**.

### A4. Verificar el acceso por TCP

En SSMS, **Connect → Database Engine**:

- **Server name:** `localhost,1433` (con coma)
- **Authentication:** Windows Authentication
- Marcar **Trust server certificate**

Si conecta, ejecutar:

```sql
SELECT local_tcp_port FROM sys.dm_exec_connections WHERE session_id = @@SPID;
```

Debe devolver `1433`. (Con `.\SQLEXPRESS` devuelve `NULL`, es normal: usa memoria compartida, no TCP.)

---

## Parte B. Crear la base de datos

Ejecutar los scripts **en orden numérico** desde SSMS (abrir el archivo → F5):

| Orden | Archivo                       | Qué hace                                          | Resultado esperado        |
|-------|-------------------------------|---------------------------------------------------|---------------------------|
| 1     | `01_crear_bd.sql`             | Crea la base de datos `CineStream`                | Commands completed        |
| 2     | `02_crear_tablas.sql`         | Crea las 7 tablas                                 | 7 tablas en `dbo`         |
| 3     | `03_seed_catalogos.sql`       | Géneros, actores, películas, usuarios             | 8, 10, 15, 25, 10         |
| 4     | `04_seed_alquileres.sql`      | Genera 50.000 alquileres (tarda ~1-2 min)         | 50000                     |
| 5     | `05_seed_resenas.sql`         | Genera 15.000 reseñas                             | 15000                     |
| 6     | `06_crear_usuario_app.sql`    | Crea el usuario `cine_app` para la aplicación     | Commands completed        |

**Antes de ejecutar el script 06**, abrirlo y cambiar `CambiarEstaClave123!` por una contraseña propia. Esa contraseña va solo en tu `.env` local; nunca se sube a Git.

---

## Parte C. Verificar el usuario de la aplicación

1. En SSMS, **Connect → Database Engine**:
   - **Server name:** `localhost,1433`
   - **Authentication:** SQL Server Authentication
   - **Login:** `cine_app` / la contraseña elegida
   - Marcar **Trust server certificate**
2. Abrir una **New Query desde esa conexión** y ejecutar:

```sql
SELECT SUSER_SNAME() AS usuario_actual;                      -- debe decir cine_app
SELECT COUNT(*) AS alquileres FROM CineStream.dbo.alquileres; -- 50000
SELECT COUNT(*) AS sesiones FROM sys.dm_exec_sessions;        -- más de 3
```

Si la tercera consulta funciona, el permiso `VIEW SERVER STATE` quedó bien.

**Permisos de `cine_app`:** solo lectura y monitoreo (`db_datareader`, `VIEW SERVER STATE`, `VIEW DATABASE STATE`, `VIEW DEFINITION`, lectura en `msdb`). No puede modificar datos.

---

## Notas

- Ejecutar los scripts 01 a 05 **una sola vez**. Para empezar de cero: `DROP DATABASE CineStream;` y repetir.
- Alquileres y reseñas son **aleatorios**: mismo volumen en cada instancia, pero no filas idénticas.
- Si se abren los archivos en un editor que no sea SSMS, usar codificación **UTF-8** para que se vean bien las tildes.
- Si se usa Docker en lugar de una instalación local, la Parte A no aplica: el contenedor ya expone el puerto 1433 y usa `sa`.

---

## Limitaciones de SQL Server Express

- **SQL Server Agent no está disponible** en Express: no se pueden programar jobs
  (respaldos automáticos, mantenimiento programado). Todo se ejecuta manualmente
  o desde la aplicación.
- **El historial de respaldos (`msdb`) empieza vacío.** El Módulo 4 solo mostrará
  datos si se realizan respaldos reales en la instancia.

## Seguridad

- Nunca subir contraseñas reales al repositorio. La contraseña de `cine_app`
  se elige localmente y va únicamente en el archivo `.env` de cada persona,
  que está excluido por `.gitignore`.