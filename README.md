# CineAdmin

Herramienta web para **monitorear, administrar y auditar una instancia de Microsoft SQL Server**.
Proyecto Integrador del curso EIF402 – Administración de Bases de Datos (UNA, II Ciclo 2026).

Como base de datos de trabajo se usa **CineStream**, una plataforma ficticia de
alquiler de películas que le da volumen y actividad real a la instancia. Toda la
información que muestra CineAdmin sale de consultas administrativas reales
(vistas de catálogo, DMVs y `msdb`); no se usan datos simulados.

## Arquitectura

```
React (frontend/)  --->  API REST Node.js + Express (backend/)  --->  SQL Server
  vistas y gráficos        rutas -> consultas -> db.js (mssql)          CineStream + msdb
```

| Capa              | Carpeta                    | Responsabilidad                                    |
|-------------------|----------------------------|----------------------------------------------------|
| Presentación      | `frontend/`                | Dashboard y navegación entre los 6 módulos         |
| Lógica / rutas    | `backend/src/routes/`      | Validación de parámetros, respuestas y errores     |
| Acceso a datos    | `backend/src/queries/`, `backend/src/db.js` | Consultas SQL y conexión compartida |
| Base de datos     | `database/`                | Scripts de CineStream, usuario y objetos `cineadmin` |

## Módulos

| Módulo | Tema                        | API                    | Responsable        |
|--------|-----------------------------|------------------------|--------------------|
| 1      | Estado de la instancia      | `/api/instancia`       | Persona 1          |
| 2      | Monitoreo de rendimiento    | `/api/rendimiento`     | Persona 2          |
| 3      | Gestión del almacenamiento  | `/api/almacenamiento`  | Persona 3          |
| 4      | Respaldo y recuperación     | `/api/respaldos`        | Persona 4          |
| 5      | Auditoría                   | `/api/auditoria`       | Persona 5          |
| 6      | Mantenimiento preventivo    | `/api/mantenimiento`   | Persona 3 y 4      |

Los contratos de cada API están en `backend/docs/`.

## Requisitos

- Windows 10/11 (probado) con **SQL Server 2022** Express o Developer y **SSMS**.
- **Node.js 20.19+ (rama 20) o 22.12+ (ramas 22 y posteriores)** (probado con v22 y v24).
- Git.

## Instalación

### 1. Base de datos

Seguir [`database/README.md`](database/README.md):

1. Configurar la instancia (TCP/IP, modo mixto).
2. Ejecutar los scripts `01` a `07` en orden.
3. Verificar el usuario `cine_app`.

### 2. Backend

```
cd backend
npm install
copy .env.example .env
```

Abrir `backend/.env` y completar `DB_PASSWORD` (y `DB_INSTANCE` si no se usa el
puerto 1433). Detalle de cada variable en [`backend/README.md`](backend/README.md).

```
npm run test:db
npm run dev
```

`http://localhost:3000/api/health` debe responder `{"api":"ok","db":"ok", ...}`.

### 3. Frontend

En otra terminal:

```
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173`. Vite reenvía las llamadas `/api` a la API del puerto 3000.

## Configuración y portabilidad

- Toda la conexión (servidor, instancia, puerto, base, usuario, contraseña,
  cifrado) se define en **un solo archivo**: `backend/.env`. No hay que modificar
  el código para apuntar a otra instancia o base de datos.
- `backend/.env.example` es la plantilla, sin credenciales reales.
- `.env` está en `.gitignore`: las contraseñas nunca se suben al repositorio.
- La aplicación usa un usuario de **mínimos privilegios** (`cine_app`), no `sa`.

## Estructura del repositorio

```
backend/        API Express (rutas, consultas, conexión, contratos en docs/)
database/       Scripts SQL de CineStream, usuario cine_app y objetos cineadmin
frontend/       Aplicación React (Vite)
README.md       Este archivo
```

## Flujo de trabajo en Git

- `main`: versión estable; solo recibe merges desde `develop` mediante PR.
- `develop`: integración de todos los módulos.
- `feature/personaN-...`: una rama por persona y módulo.
