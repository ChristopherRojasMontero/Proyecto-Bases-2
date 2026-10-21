# CineAdmin frontend

Aplicación React para visualizar el estado administrativo de SQL Server. La vista general y el Módulo 1 consultan la API real; las demás vistas funcionan como puntos de integración hasta que sus endpoints estén disponibles en la rama actual.

## Requisitos

- Node.js 18 o superior.
- API del backend en `http://localhost:3000`.

## Inicio local

En una terminal, inicia el backend desde `backend/`:

```bash
npm install
npm run dev
```

En otra terminal, inicia el frontend desde `frontend/`:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite reenvía las solicitudes `/api` al backend en el puerto 3000. La conexión al SGBD se configura en `backend/.env`; no se escriben credenciales en el navegador.

## Módulos

- **Vista general:** conexión, servidor, versión, uptime, bases de usuario y tamaño actual, obtenidos del Módulo 1.
- **Estado de instancia:** identidad y estado de SQL Server, configuración y lista de bases de datos.
- **Almacenamiento, rendimiento, respaldo, auditoría y mantenimiento:** navegación lista para integrar; una pantalla indica cuando el endpoint todavía no está conectado o no está disponible en la rama actual.

La memoria máxima se presenta como configuración del motor, no como memoria realmente consumida. Para mostrar uso real se necesita una consulta y un campo adicional en la API.
