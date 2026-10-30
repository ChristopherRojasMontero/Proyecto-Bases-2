# CineAdmin frontend

Aplicación React para visualizar el estado administrativo de SQL Server. La vista general y los seis módulos consultan datos reales mediante la API; se muestran estados de carga, errores y resultados vacíos sin reemplazarlos por datos simulados.

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

- **Vista general y Estado de instancia:** identidad, disponibilidad, versión, uptime, memoria física del proceso y bases de datos.
- **Rendimiento:** consultas de mayor consumo, tiempos, sesiones activas, bloqueos y recursos por sesión.
- **Almacenamiento:** filegroups, tamaño, tablas e índices grandes, crecimiento configurado e historial de mediciones.
- **Respaldo y recuperación:** último respaldo, historial y operaciones activas. La vista informa si msdb todavía no registra respaldos.
- **Auditoría:** usuarios, roles, asignaciones de privilegios y objetos problemáticos.
- **Mantenimiento:** estado de estadísticas, objetos inválidos e historial. Las acciones se confirman antes de enviarse al backend.

La memoria usada corresponde a la memoria física que SQL Server informa para su proceso; el límite se presenta por separado como configuración del motor.
