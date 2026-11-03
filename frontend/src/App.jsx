import { useMemo, useState } from 'react';
import { useModuleData } from './useModuleData';

const modules = [
  { id: 'overview', label: 'Vista general', icon: '◫' },
  { id: 'instance', label: 'Estado de instancia', icon: '◉' },
  { id: 'performance', label: 'Rendimiento', icon: '⌁' },
  { id: 'storage', label: 'Almacenamiento', icon: '▤' },
  { id: 'backup', label: 'Respaldo y recuperación', icon: '⟲' },
  { id: 'audit', label: 'Auditoría', icon: '◎' },
  { id: 'maintenance', label: 'Mantenimiento', icon: '✳' },
];

const moduleNames = {
  overview: 'Vista general', instance: 'Estado de instancia', performance: 'Rendimiento',
  storage: 'Almacenamiento', backup: 'Respaldo y recuperación', audit: 'Auditoría', maintenance: 'Mantenimiento',
};

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5l3 5"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    chevron: <><path d="m9 18 6-6-6-6"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    server: <><rect x="4" y="3" width="16" height="8" rx="2"/><rect x="4" y="13" width="16" height="8" rx="2"/><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5"/></>,
    memory: <><rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/></>,
    pulse: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4L7.5 15a8 8 0 0 1 0-1.9L6.1 12l1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9Z" transform="translate(-1 -1) scale(1.08)"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.database}</svg>;
}

function formatBytesMb(value) {
  if (value === null || value === undefined || value === '') return '?';
  const mb = Number(value);
  if (!Number.isFinite(mb)) return '—';
  if (mb > 0 && mb < 1) return `${Math.round(mb * 1024).toLocaleString('es-CR')} KB`;
  if (mb >= 1024) return `${(mb / 1024).toLocaleString('es-CR', { maximumFractionDigits: 1 })} GB`;
  return `${mb.toLocaleString('es-CR', { maximumFractionDigits: 0 })} MB`;
}

function formatUptime(minutes) {
  const total = Math.max(0, Number(minutes) || 0);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = Math.floor(total % 60);
  return `${days} d  ${hours} h  ${mins} min`;
}

// Contratos existentes: solo cambia la coordinación de carga y errores.
const moduleRequests = {
  instance: {
    initial: {"version":null,"uptime":null,"databases":[],"configuration":[],"memory":null},
    requests: [
      ['version', '/api/instancia/version'],
      ['uptime', '/api/instancia/uptime'],
      ['databases', '/api/instancia/bases-datos'],
      ['configuration', '/api/instancia/configuracion'],
      ['memory', '/api/instancia/memoria'],
    ],
  },
  storage: {
    initial: {"filegroups":[],"size":[],"objects":[],"growth":[],"summary":null,"indices":[],"history":null,"backupGrowth":[]},
    requests: [
      ['filegroups', '/api/almacenamiento/filegroups'],
      ['size', '/api/almacenamiento/tamano'],
      ['objects', '/api/almacenamiento/objetos-grandes'],
      ['growth', '/api/almacenamiento/crecimiento'],
      ['summary', '/api/almacenamiento/resumen'],
      ['indices', '/api/almacenamiento/indices-grandes?top=10'],
      ['history', '/api/almacenamiento/crecimiento/historial?dias=30'],
      ['backupGrowth', '/api/almacenamiento/crecimiento/respaldos?dias=90'],
    ],
  },
  performance: {
    initial: {"summary":null,"queries":[],"sessions":[],"blocked":[],"resources":[]},
    requests: [
      ['summary', '/api/rendimiento/tiempo-promedio'],
      ['queries', '/api/rendimiento/consultas-top?limite=10&orden=cpu'],
      ['sessions', '/api/rendimiento/sesiones-activas'],
      ['blocked', '/api/rendimiento/sesiones-bloqueadas'],
      ['resources', '/api/rendimiento/procesos-recursos?limite=10&orden=cpu'],
    ],
  },
  backup: {
    initial: {"history":[],"last":null,"active":[]},
    requests: [
      ['history', '/api/respaldos?limite=50', body => body.data || []],
      ['last', '/api/respaldos/ultimo', body => body.data || null],
      ['active', '/api/respaldos/activos', body => body.data || []],
    ],
  },
  audit: {
    initial: {"users":[],"roles":[],"privileges":null,"problematic":null},
    requests: [
      ['users', '/api/auditoria/usuarios', body => body.datos || []],
      ['roles', '/api/auditoria/roles', body => body.datos || []],
      ['privileges', '/api/auditoria/privilegios'],
      ['problematic', '/api/auditoria/objetos-problematicos'],
    ],
  },
  maintenance: {
    initial: {"statistics":null,"invalid":null,"history":[]},
    requests: [
      ['statistics', '/api/mantenimiento/estadisticas'],
      ['invalid', '/api/mantenimiento/objetos-invalidos'],
      ['history', '/api/mantenimiento/historial?limite=50'],
    ],
  },
};

function useInstanceData(enabled = true) {
  return useModuleData(moduleRequests.instance, enabled);
}

function useStorageData(enabled = true) {
  return useModuleData(moduleRequests.storage, enabled);
}

function usePerformanceData(enabled = true) {
  return useModuleData(moduleRequests.performance, enabled);
}

function useBackupData(enabled = true) {
  return useModuleData(moduleRequests.backup, enabled);
}

function useAuditData(enabled = true) {
  return useModuleData(moduleRequests.audit, enabled);
}

function useMaintenanceData(enabled = true) {
  return useModuleData(moduleRequests.maintenance, enabled);
}

function SectionErrors({ errors = {}, keys }) {
  const labels = { version: 'Identidad del motor', uptime: 'Tiempo activo', databases: 'Bases de datos',
    configuration: 'Configuración', memory: 'Memoria', filegroups: 'Archivos y filegroups', size: 'Tamaño',
    objects: 'Tablas', growth: 'Crecimiento', summary: 'Resumen', indices: 'Índices', history: 'Historial',
    backupGrowth: 'Crecimiento por respaldos', queries: 'Consultas', sessions: 'Sesiones', blocked: 'Bloqueos',
    resources: 'Recursos', last: 'Último respaldo', active: 'Respaldos activos', users: 'Usuarios', roles: 'Roles',
    privileges: 'Privilegios', problematic: 'Objetos problemáticos', statistics: 'Estadísticas', invalid: 'Objetos inválidos' };
  return keys.filter((key) => errors[key]).map((key) => <div className="alert error" role="alert" key={key}><span>!</span><div><b>{labels[key]}: consulta no disponible</b><small>{errors[key]}</small></div></div>);
}

function Header({ title, state, instanceState, partial, updatedAt, onRefresh }) {
  return <header className="topbar">
    <div className="breadcrumbs"><span>CINEADMIN</span><Icon name="chevron" size={13}/><strong>{title}</strong></div>
    <div className="topbar-actions">
      <span className={`connection-pill ${instanceState}`}><i />{instanceState === 'online' ? 'Instancia conectada' : instanceState === 'loading' ? 'Consultando instancia' : instanceState === 'partial' ? 'Instancia: consulta parcial' : 'Instancia sin verificar'}</span>
      <small role="status">{state === 'loading' ? 'Cargando módulo' : state === 'offline' ? 'Error del módulo' : partial ? 'Módulo con errores parciales' : state === 'online' ? 'Módulo actualizado' : 'Módulo pendiente'}{updatedAt && ` · Última consulta con datos ${updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}`}</small>
      <button className="icon-button" title="Actualizar datos" onClick={onRefresh}><Icon name="refresh" size={17}/></button>
      <div className="avatar">DBA</div>
    </div>
  </header>;
}

function Sidebar({ active, onSelect, state }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-mark"><span/><span/><span/></div><div><b>cineadmin</b><small>DATABASE CONSOLE</small></div></div>
    <div className="sidebar-section-label">ESPACIO DE TRABAJO</div>
    <div className="workspace-switch"><div className="workspace-icon">CS</div><div><strong>CineStream</strong><small>SQL Server · Local</small></div><span className="workspace-menu">⌄</span></div>
    <div className="sidebar-section-label module-label">MONITOREO</div>
    <nav className="nav-list" aria-label="Módulos de CineAdmin">
      {modules.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)} aria-label={item.label} title={item.label}>
        <span className="nav-icon">{item.id === 'overview' ? item.icon : <Icon name={item.id === 'instance' ? 'server' : item.id === 'performance' ? 'pulse' : item.id === 'storage' ? 'database' : item.id === 'backup' ? 'refresh' : item.id === 'audit' ? 'shield' : 'settings'} size={17}/>}</span>
        <span>{item.label}</span>
      </button>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="server-mini"><div className="server-mini-head"><Icon name="server" size={15}/><span>ESTADO DE CONEXIÓN</span><i className={state}/></div><b>{state === 'online' ? 'SQL Server activo' : state === 'loading' ? 'Verificando…' : 'No disponible'}</b><small>{state === 'online' ? 'Última comprobación correcta' : 'Revisa la API y la conexión SQL'}</small></div>
      <div className="profile"><div className="profile-avatar">AD</div><div><b>Administrador</b><small>Operador local</small></div><span>···</span></div>
    </div>
  </aside>;
}

function PageTitle({ eyebrow, title, description, right }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{right && <div className="heading-right">{right}</div>}</div>;
}

function MetricCard({ label, value, detail, icon, tone = 'blue' }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon name={icon} size={17}/></div></div><strong className="metric-value">{value}</strong><div className="metric-detail">{detail}</div></article>;
}

function Overview({ data, state, error, onSelect, onRefresh, updatedAt, errors = {} }) {
  const userDbs = data.databases.filter((db) => !['master', 'model', 'msdb', 'tempdb'].includes(db.base_de_datos.toLowerCase()));
  const onlineUserCount = userDbs.filter((db) => db.estado === 'ONLINE').length;
  const totalSize = userDbs.reduce((total, db) => total + Number(db.tamano_mb || 0), 0);
  const serverMemory = data.configuration.find((item) => item.parametro === 'max server memory (MB)');
  const memory = data.memory?.memoria_usada_mb != null ? formatBytesMb(data.memory.memoria_usada_mb) : '—';
  const memoryMax = serverMemory && Number(serverMemory.valor_actual) < 2147483647 ? formatBytesMb(serverMemory.valor_actual) : 'Sin límite';
  const topDb = [...userDbs].sort((a, b) => Number(b.tamano_mb) - Number(a.tamano_mb)).slice(0, 5);
  const largest = Math.max(...topDb.map((db) => Number(db.tamano_mb) || 0), 1);

  return <>
    <PageTitle eyebrow="PANORAMA DEL SISTEMA" title="Vista general" description="Un resumen operativo de la instancia y sus bases de datos." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar datos</button>} />
    <SectionErrors errors={errors} keys={["version","uptime","configuration","memory"]}/>
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar la instancia</b><small>{error} Inicia el backend y revisa su archivo <code>.env</code>.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <section className="hero-card">
      <div className="hero-copy"><div className="hero-kicker"><span className="live-dot"/>ESTADO DE LA INSTANCIA</div><h2>{state === 'online' ? Object.keys(errors).length ? 'Consulta parcial de la instancia.' : 'Todo está en orden.' : state === 'loading' ? 'Conectando con SQL Server…' : 'Instancia sin conexión'}</h2><p>{state === 'online' ? 'La API respondió a las consultas administrativas.' : state === 'loading' ? 'Consultando información real del motor.' : 'No hay datos disponibles hasta recuperar la conexión.'}</p><button className="hero-link" onClick={() => onSelect('instance')}>Ver estado de instancia <Icon name="arrow" size={15}/></button></div>
      <div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-db"><Icon name="database" size={27}/></div><div className="orbit-node node-a"/><div className="orbit-node node-b"/><div className="orbit-node node-c"/></div>
      <div className="hero-meta"><div><small>SERVIDOR</small><b>{data.version?.servidor || '—'}</b></div><div><small>MOTOR</small><b>{data.version?.edicion?.replace(' Edition (64-bit)', '') || 'SQL Server'}</b></div><div><small>VERSIÓN</small><b>{data.version?.version || '—'}</b></div></div>
    </section>
    <div className="metrics-grid">
      <MetricCard label="Tiempo activo" value={data.uptime ? formatUptime(data.uptime.minutos_activo) : '—'} detail={data.uptime?.inicio ? `Desde ${new Date(data.uptime.inicio).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Último inicio de instancia'} icon="clock" tone="violet" />
      <MetricCard label="Bases de datos" value={state === 'online' && !errors.databases ? userDbs.length : '—'} detail={state === 'online' && !errors.databases ? `${onlineUserCount} bases de usuario en línea` : 'Esperando información del motor'} icon="database" tone="teal" />
      <MetricCard label="Almacenamiento actual" value={state === 'online' && !errors.databases ? formatBytesMb(totalSize) : '—'} detail="Suma de bases de usuario · datos y log" icon="memory" tone="amber" />
      <MetricCard label="Memoria usada por SQL Server" value={state === 'online' && !errors.memory ? memory : '—'} detail={`Memoria máxima configurada: ${memoryMax}`} icon="server" tone="blue" />
    </div>
    <div className="content-grid overview-grid">
      <section className="panel database-panel"><SectionErrors errors={errors} keys={["databases"]}/><div className="panel-heading"><div><h3>Bases de datos</h3><p>Estado y tamaño actual reportado por la instancia</p></div><button className="text-button" onClick={() => onSelect('instance')}>Ver todas <Icon name="chevron" size={14}/></button></div>
        {topDb.length ? <div className="database-list">{topDb.map((db) => <div className="db-row" key={db.base_de_datos}><div className="db-logo"><Icon name="database" size={16}/></div><div className="db-name"><b>{db.base_de_datos}</b><small>{db.modelo_recuperacion} · {db.estado}</small></div><div className="db-bar-wrap"><div className="db-bar"><i style={{ width: `${Math.max(3, (Number(db.tamano_mb) / largest) * 100)}%` }}/></div><small>{formatBytesMb(db.tamano_mb)}</small></div><span className={`status-label ${db.estado === 'ONLINE' ? 'good' : 'bad'}`}><i/>{db.estado}</span></div>)}</div> : <div className="empty-state">{state === 'loading' ? 'Cargando bases de datos…' : 'No hay bases de usuario disponibles.'}</div>}
        <div className="panel-footnote">Solo se muestran bases de usuario. La lista completa está disponible en Estado de instancia.</div>
      </section>
      <section className="panel modules-panel"><div className="panel-heading"><div><h3>Módulos del sistema</h3><p>Monitoreo centralizado de SQL Server</p></div><span className="module-count">6</span></div>
        <div className="module-shortcuts">{modules.filter((item) => item.id !== 'overview').map((item) => <button key={item.id} className="module-shortcut" onClick={() => onSelect(item.id)}><span className="shortcut-icon"><Icon name={item.id === 'instance' ? 'server' : item.id === 'performance' ? 'pulse' : item.id === 'storage' ? 'database' : item.id === 'backup' ? 'refresh' : item.id === 'audit' ? 'shield' : 'settings'} size={16}/></span><span>{item.label}</span><Icon name="chevron" size={14}/></button>)}</div>
      </section>
    </div>
    <div className="last-updated"><span className="live-dot"/>Datos consultados directamente a SQL Server{updatedAt ? ` · actualizado ${updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
  </>;
}

function InstancePage({ data, state, error, onRefresh, errors = {} }) {
  const startDate = data.uptime?.inicio ? new Date(data.uptime.inicio) : null;
  const parameters = useMemo(() => Object.fromEntries(data.configuration.map((item) => [item.parametro, item])), [data.configuration]);
  return <>
    <PageTitle eyebrow="MÓDULO 01 · MONITOREO" title="Estado de instancia" description="Identidad, disponibilidad y configuración general del motor SQL Server." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    <SectionErrors errors={errors} keys={["uptime"]}/>
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>Sin conexión con SQL Server</b><small>{error} Comprueba el backend y las variables de conexión.</small></div></div>}
    {state === 'online' && (data.memory?.alerta_memoria_fisica_baja || data.memory?.alerta_memoria_virtual_baja) && <div className="alert warning"><span>!</span><div><b>SQL Server reporta presión de memoria</b><small>{[data.memory?.alerta_memoria_fisica_baja && 'memoria física', data.memory?.alerta_memoria_virtual_baja && 'memoria virtual'].filter(Boolean).join(' y ')} disponible baja para el proceso. Revisa los recursos del equipo.</small></div></div>}
    <section className="instance-banner"><div className="instance-symbol"><Icon name="server" size={23}/></div><div className="instance-info"><div className="instance-title"><h2>{data.version?.servidor || 'Instancia SQL Server'}</h2><span className={`status-label ${state === 'online' ? 'good' : state === 'loading' ? 'neutral' : 'bad'}`}><i/>{state === 'online' ? 'OPERATIVA' : state === 'loading' ? 'CONSULTANDO' : 'SIN CONEXIÓN'}</span></div><p>{data.version?.edicion || 'Microsoft SQL Server'}{data.version?.version ? ` · Versión ${data.version.version}` : ''}{data.version?.nivel_parche ? ` · ${data.version.nivel_parche}` : ''}</p></div><div className="instance-tag"><small>TIPO DE MOTOR</small><b>Microsoft SQL Server</b></div></section>
    <div className="metrics-grid instance-metrics"><MetricCard label="Tiempo activa" value={data.uptime ? formatUptime(data.uptime.minutos_activo) : '—'} detail="Desde el último arranque del servicio" icon="clock" tone="violet"/><MetricCard label="Bases administradas" value={state === 'online' && !errors.databases ? data.databases.length : '—'} detail="Incluye bases del sistema" icon="database" tone="teal"/><MetricCard label="Bases en línea" value={state === 'online' && !errors.databases ? data.databases.filter((db) => db.estado === 'ONLINE').length : '—'} detail="Estado reportado por sys.databases" icon="pulse" tone="blue"/><MetricCard label="Memoria física usada" value={state === 'online' && !errors.memory ? formatBytesMb(data.memory?.memoria_usada_mb) : '—'} detail={parameters['max server memory (MB)'] ? `Límite configurado: ${Number(parameters['max server memory (MB)'].valor_actual) >= 2147483647 ? 'Sin límite' : formatBytesMb(parameters['max server memory (MB)'].valor_actual)}` : 'Uso del proceso SQL Server'} icon="memory" tone="amber"/></div>
    <div className="content-grid instance-grid">
      <section className="panel"><SectionErrors errors={errors} keys={["version"]}/><div className="panel-heading"><div><h3>Información del motor</h3><p>Identificación y último inicio de la instancia</p></div><span className="small-badge">EN VIVO</span></div><div className="detail-list"><div><span>Servidor / instancia</span><b>{data.version?.servidor || '—'}</b></div><div><span>Sistema gestor</span><b>Microsoft SQL Server</b></div><div><span>Edición</span><b>{data.version?.edicion || '—'}</b></div><div><span>Versión del producto</span><b>{data.version?.version || '—'}</b></div><div><span>Nivel de actualización</span><b>{data.version?.nivel_parche || '—'}</b></div><div><span>Inicio de instancia</span><b>{startDate ? startDate.toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' }) : '—'}</b></div></div></section>
      <section className="panel"><SectionErrors errors={errors} keys={["memory","configuration"]}/><div className="panel-heading"><div><h3>Memoria y paralelismo</h3><p>Uso actual y parámetros efectivos de configuración</p></div><span className="panel-icon"><Icon name="settings" size={16}/></span></div><div className="detail-list"><div><span>Memoria física usada por el proceso</span><b>{formatBytesMb(data.memory?.memoria_usada_mb)}</b></div><div><span>Porcentaje de memoria del proceso</span><b>{data.memory?.porcentaje_memoria_proceso == null ? '—' : `${data.memory.porcentaje_memoria_proceso}%`}</b></div></div><div className="config-list">{data.configuration.map((item) => <div className="config-row" key={item.parametro}><div><b>{item.parametro}</b><small>{item.descripcion}</small></div><div><span>{Number(item.valor_actual) >= 2147483647 && item.parametro.includes('memory') ? 'Sin límite' : Number(item.valor_actual).toLocaleString('es-CR')}{item.parametro.includes('memory') && Number(item.valor_actual) < 2147483647 ? ' MB' : ''}</span><small>actual</small></div></div>)}</div><div className="notice"><Icon name="memory" size={15}/><span>La memoria física usada corresponde al proceso SQL Server; el porcentaje lo reporta la DMV y no representa el porcentaje del límite configurado.</span></div></section>
    </div>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["databases"]}/><div className="panel-heading"><div><h3>Bases de datos de la instancia</h3><p>Inventario completo con estado y tamaño actual de archivos de datos y log.</p></div><span className="table-count">{state === 'online' ? `${data.databases.length} bases` : '—'}</span></div>
      <div className="table-scroll"><table><thead><tr><th>BASE DE DATOS</th><th>ESTADO</th><th>MODELO DE RECUPERACIÓN</th><th>FECHA DE CREACIÓN</th><th className="align-right">TAMAÑO</th></tr></thead><tbody>{data.databases.map((db) => <tr key={db.base_de_datos}><td><span className="table-db-icon"><Icon name="database" size={15}/></span><b>{db.base_de_datos}</b></td><td><span className={`status-label ${db.estado === 'ONLINE' ? 'good' : 'bad'}`}><i/>{db.estado}</span></td><td><span className="mono-chip">{db.modelo_recuperacion}</span></td><td>{db.fecha_creacion ? new Date(db.fecha_creacion).toLocaleDateString('es-CR', { dateStyle: 'medium' }) : '—'}</td><td className="align-right size-cell">{formatBytesMb(db.tamano_mb)}</td></tr>)}{!data.databases.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' ? 'Consultando información…' : 'No hay resultados disponibles.'}</td></tr>}</tbody></table></div>
    </section>
    <div className="footnote"><Icon name="shield" size={14}/> La conexión se configura mediante el archivo <code>backend/.env</code>. Las credenciales no se guardan en el navegador.</div>
  </>;
}

function StoragePage({ data, state, error, onRefresh, errors = {} }) {
  const totalMb = data.size.reduce((sum, item) => sum + (Number(item.tamano_mb) || 0), 0);
  const largestObject = Math.max(...data.objects.map((item) => Number(item.tamano_total_mb) || 0), 1);
  const history = data.history?.mediciones || [];
  const growthSummary = data.history?.resumen || {};
  return <>
    <PageTitle eyebrow="MÓDULO 03 · MONITOREO" title="Gestión del almacenamiento" description="Uso de archivos, filegroups, objetos de mayor tamaño y crecimiento configurado." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    <SectionErrors errors={errors} keys={["summary"]}/>
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar el almacenamiento</b><small>{error} Comprueba que el backend tenga registrada la ruta /api/almacenamiento.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Tamaño total" value={state === 'online' && !errors.summary && (data.summary || !errors.size) ? formatBytesMb(data.summary?.tamano_total_mb ?? totalMb) : '—'} detail="Archivos de datos y log" icon="database" tone="violet"/>
      <MetricCard label="Uso de archivos de datos" value={state === 'online' && data.summary ? `${Number(data.summary.porcentaje_uso_datos || 0).toLocaleString('es-CR', { maximumFractionDigits: 1 })}%` : '—'} detail={state === 'online' && data.summary ? `${formatBytesMb(data.summary.datos_usado_mb)} usados de ${formatBytesMb(data.summary.datos_asignado_mb)}` : 'Espacio usado / asignado'} icon="memory" tone="teal"/>
      <MetricCard label="Objetos reservados" value={state === 'online' && !errors.summary ? formatBytesMb(data.summary?.reservado_objetos_mb) : '—'} detail={state === 'online' && !errors.summary ? `${formatBytesMb(data.summary?.tablas_mb)} tablas · ${formatBytesMb(data.summary?.indices_mb)} índices` : 'Tablas e índices'} icon="server" tone="blue"/>
      <MetricCard label="Historial de mediciones" value={state === 'online' && !errors.history ? history.length.toLocaleString('es-CR') : '—'} detail={state === 'online' && !errors.history && growthSummary.crecimiento_datos_mb != null ? `${formatBytesMb(growthSummary.crecimiento_datos_mb)} de crecimiento en el periodo` : 'Se necesitan dos mediciones para comparar'} icon="pulse" tone="amber"/>
    </div>
    <div className="content-grid instance-grid">
      <section className="panel"><SectionErrors errors={errors} keys={["filegroups"]}/><div className="panel-heading"><div><h3>Archivos y filegroups</h3><p>Espacio asignado, usado y libre en la base seleccionada</p></div><span className="small-badge">{state === 'online' ? `${data.filegroups.length} archivos` : 'EN VIVO'}</span></div>
        <div className="table-scroll"><table><thead><tr><th>FILEGROUP</th><th>ARCHIVO</th><th>TIPO</th><th className="align-right">ASIGNADO</th><th className="align-right">USADO</th><th className="align-right">LIBRE</th></tr></thead><tbody>{data.filegroups.map((item) => <tr key={item.archivo_logico}><td><span className="mono-chip">{item.filegroup || '—'}</span></td><td><b>{item.archivo_logico}</b></td><td>{item.type_desc}</td><td className="align-right size-cell">{formatBytesMb(item.tamano_mb)}</td><td className="align-right">{item.usado_mb == null ? '—' : formatBytesMb(item.usado_mb)}</td><td className="align-right">{item.libre_mb == null ? '—' : formatBytesMb(item.libre_mb)}</td></tr>)}{!data.filegroups.length && <tr><td colSpan="6" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando archivos…' : 'No hay archivos disponibles.'}</td></tr>}</tbody></table></div>
        <div className="panel-footnote">Los archivos de log no pertenecen a un filegroup; por eso pueden mostrar “—” en esa columna.</div>
      </section>
      <section className="panel"><SectionErrors errors={errors} keys={["size"]}/><div className="panel-heading"><div><h3>Tamaño por tipo de archivo</h3><p>Distribución actual de almacenamiento</p></div><span className="panel-icon"><Icon name="database" size={16}/></span></div>
        <div className="storage-bars">{data.size.map((item) => { const pct = totalMb ? Number(item.tamano_mb) / totalMb * 100 : 0; return <div className="storage-type" key={item.type_desc}><div className="storage-type-head"><span><i className={item.type_desc === 'LOG' ? 'log' : ''}/>{item.type_desc === 'ROWS' ? 'Datos' : item.type_desc === 'LOG' ? 'Registro de transacciones' : item.type_desc}</span><b>{formatBytesMb(item.tamano_mb)}</b></div><div className="storage-track"><i className={item.type_desc === 'LOG' ? 'log' : ''} style={{width:`${pct}%`}}/></div><small>{pct.toLocaleString('es-CR',{maximumFractionDigits:1})}% del tamaño total</small></div>; })}{!data.size.length && <div className="empty-state">{state === 'loading' || state === 'idle' ? 'Cargando resumen…' : 'Sin información de tamaños.'}</div>}</div>
        <div className="notice"><Icon name="pulse" size={15}/><span>Las mediciones se registran al instalar el script 07 y luego según el intervalo de backend/.env; con una sola medición todavía no se puede calcular una tendencia.</span></div>
      </section>
    </div>
    <section className="panel full-panel storage-objects"><SectionErrors errors={errors} keys={["objects"]}/><div className="panel-heading"><div><h3>Objetos de mayor tamaño</h3><p>Tablas de usuario ordenadas por páginas asignadas, según la base configurada en la conexión.</p></div><span className="table-count">TOP 10</span></div>
      <div className="table-scroll"><table><thead><tr><th>TABLA</th><th className="align-right">FILAS</th><th>TAMAÑO ASIGNADO</th><th className="align-right">USADO</th><th>PROPORCIÓN</th></tr></thead><tbody>{data.objects.map((item) => {const pct=(Number(item.tamano_total_mb)||0)/largestObject*100; return <tr key={item.tabla}><td><span className="table-db-icon"><Icon name="database" size={14}/></span><b>{item.tabla}</b></td><td className="align-right">{Number(item.filas||0).toLocaleString('es-CR')}</td><td className="size-cell">{formatBytesMb(item.tamano_total_mb)}</td><td className="align-right">{formatBytesMb(item.tamano_usado_mb)}</td><td><div className="object-bar"><i style={{width:`${Math.max(2,pct)}%`}}/></div></td></tr>;})}{!data.objects.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando objetos…' : 'No hay tablas de usuario para mostrar.'}</td></tr>}</tbody></table></div>
    </section>
    <section className="panel full-panel storage-objects"><SectionErrors errors={errors} keys={["indices"]}/><div className="panel-heading"><div><h3>Índices de mayor tamaño</h3><p>Espacio reservado por tabla e índice, incluidos los heaps.</p></div><span className="table-count">TOP 10</span></div>
      <div className="table-scroll"><table><thead><tr><th>TABLA</th><th>ÍNDICE</th><th>TIPO</th><th>CLAVE PRIMARIA</th><th>TAMAÑO</th><th>FILAS</th></tr></thead><tbody>
        {data.indices.map((item, index) => <tr key={`${item.esquema}.${item.tabla}.${item.indice}.${index}`}><td>{item.tabla}</td><td><b>{item.indice}</b></td><td>{item.tipo || '—'}</td><td>{item.es_llave_primaria ? 'Sí' : 'No'}</td><td>{formatBytesMb(item.tamano_total_mb)}</td><td>{Number(item.filas || 0).toLocaleString('es-CR')}</td></tr>)}
        {!data.indices.length && <tr><td colSpan="6" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando índices…' : 'No hay índices para mostrar.'}</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel full-panel growth-panel"><SectionErrors errors={errors} keys={["growth"]}/><div className="panel-heading"><div><h3>Configuración de crecimiento</h3><p>Incremento automático y tamaño máximo configurado para cada archivo.</p></div><span className="panel-icon"><Icon name="pulse" size={16}/></span></div>
      <div className="table-scroll"><table><thead><tr><th>ARCHIVO LÓGICO</th><th>TIPO</th><th>TAMAÑO ACTUAL</th><th>AUTOGROWTH</th><th>TAMAÑO MÁXIMO</th></tr></thead><tbody>{data.growth.map((item) => <tr key={item.archivo_logico}><td><b>{item.archivo_logico}</b></td><td>{item.type_desc}</td><td className="size-cell">{formatBytesMb(item.tamano_actual_mb)}</td><td><span className="mono-chip">{item.incremento_autogrowth}</span></td><td>{item.tamano_maximo}</td></tr>)}{!data.growth.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando crecimiento…' : 'Sin configuración disponible.'}</td></tr>}</tbody></table></div>
    </section>
    <section className="panel full-panel growth-panel"><SectionErrors errors={errors} keys={["history"]}/><div className="panel-heading"><div><h3>Historial de crecimiento</h3><p>Mediciones reales del tamaño y espacio usado durante los últimos 30 días.</p></div><span className="table-count">{history.length} mediciones</span></div>
      {history.length >= 2 && <div className="panel-footnote">Variación de datos usados: {formatBytesMb(growthSummary.crecimiento_datos_mb)} · Promedio diario: {growthSummary.crecimiento_diario_mb == null ? '—' : `${growthSummary.crecimiento_diario_mb} MB/día`}</div>}
      <div className="table-scroll"><table><thead><tr><th>FECHA</th><th>TAMAÑO TOTAL</th><th>DATOS ASIGNADOS</th><th>DATOS USADOS</th><th>LOG ASIGNADO</th><th>VARIACIÓN</th></tr></thead><tbody>
        {history.map((item, index) => <tr key={`${item.fecha_medicion}-${index}`}><td>{formatDateTime(item.fecha_medicion)}</td><td>{formatBytesMb(item.tamano_total_mb)}</td><td>{formatBytesMb(item.datos_asignado_mb)}</td><td>{formatBytesMb(item.datos_usado_mb)}</td><td>{formatBytesMb(item.log_asignado_mb)}</td><td>{index === 0 ? '—' : formatBytesMb(item.variacion_mb)}</td></tr>)}
        {!history.length && <tr><td colSpan="6" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando mediciones…' : 'No hay mediciones dentro del periodo.'}</td></tr>}
      </tbody></table></div>
    </section>
    {(data.backupGrowth.length > 0 || errors.backupGrowth) && <section className="panel full-panel"><SectionErrors errors={errors} keys={["backupGrowth"]}/><div className="panel-heading"><div><h3>Tamaño en respaldos completos</h3><p>Segunda fuente histórica registrada por SQL Server.</p></div><span className="table-count">{data.backupGrowth.length} respaldos</span></div><div className="table-scroll"><table><thead><tr><th>FECHA</th><th>TAMAÑO</th><th>COMPRIMIDO</th></tr></thead><tbody>{data.backupGrowth.map((item, index) => <tr key={`${item.fecha}-${index}`}><td>{formatDateTime(item.fecha)}</td><td>{formatBytesMb(item.tamano_respaldo_mb)}</td><td>{formatBytesMb(item.tamano_comprimido_mb)}</td></tr>)}</tbody></table></div></section>}
    <div className="footnote"><Icon name="shield" size={14}/> Consultas administrativas de solo lectura. Los resultados corresponden a la base seleccionada en <code>backend/.env</code>.</div>
  </>;
}

function formatMs(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toLocaleString('es-CR', { maximumFractionDigits: 1 })} ms` : '—';
}

function formatMemory(kilobytes) {
  if (kilobytes === null || kilobytes === undefined || kilobytes === '') return '—';
  const value = Number(kilobytes);
  if (!Number.isFinite(value)) return '—';
  return value >= 1024
    ? `${(value / 1024).toLocaleString('es-CR', { maximumFractionDigits: 1 })} MB`
    : `${value.toLocaleString('es-CR', { maximumFractionDigits: 0 })} KB`;
}

function PerformancePage({ data, state, error, updatedAt, onRefresh, errors = {} }) {
  const summary = data.summary;
  const emptyMessage = state === 'loading' ? 'Consultando SQL Server…' : 'No hay datos disponibles en este momento.';
  return <>
    <PageTitle eyebrow="MÓDULO 02 · MONITOREO" title="Rendimiento" description="Consultas con mayor consumo, tiempos de ejecución, sesiones y bloqueos activos." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    <SectionErrors errors={errors} keys={["summary"]}/>
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar el rendimiento</b><small>{error} Comprueba la conexión de SQL Server y los permisos de monitoreo.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Ejecuciones en caché" value={state === 'online' && !errors.summary ? Number(summary?.ejecuciones_totales || 0).toLocaleString('es-CR') : '—'} detail="Acumuladas desde el último reinicio o expulsión del plan" icon="pulse" tone="violet" />
      <MetricCard label="Consultas distintas" value={state === 'online' && !errors.summary ? Number(summary?.consultas_distintas || 0).toLocaleString('es-CR') : '—'} detail="Planes de consulta actualmente en caché" icon="database" tone="teal" />
      <MetricCard label="Duración promedio" value={state === 'online' && !errors.summary ? formatMs(summary?.duracion_promedio_ms) : '—'} detail={state === 'online' && !errors.summary ? `Máxima ${formatMs(summary?.duracion_maxima_ms)}` : 'Tiempo transcurrido por ejecución'} icon="clock" tone="amber" />
      <MetricCard label="CPU promedio" value={state === 'online' && !errors.summary ? formatMs(summary?.cpu_promedio_ms) : '—'} detail="CPU promedio por ejecución en caché" icon="memory" tone="blue" />
    </div>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["queries"]}/>
      <div className="panel-heading"><div><h3>Consultas de mayor consumo</h3><p>Ordenadas por CPU acumulada; las estadísticas se reinician con la caché de planes.</p></div><span className="table-count">{data.queries.length} consultas</span></div>
      <div className="table-scroll"><table><thead><tr><th>CONSULTA</th><th>BASE</th><th>EJECUCIONES</th><th>CPU PROMEDIO</th><th>DURACIÓN PROMEDIO</th><th>LECTURAS</th></tr></thead><tbody>
        {data.queries.map((item, index) => <tr key={`${item.ultima_ejecucion}-${index}`}><td title={item.consulta || ''}><span style={{ display: 'inline-block', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' }}>{item.consulta || 'Consulta no disponible'}</span></td><td>{item.base_de_datos || '—'}</td><td>{Number(item.ejecuciones || 0).toLocaleString('es-CR')}</td><td className="size-cell">{formatMs(item.cpu_promedio_ms)}</td><td>{formatMs(item.duracion_promedio_ms)}</td><td>{Number(item.lecturas_logicas || 0).toLocaleString('es-CR')}</td></tr>)}
        {!data.queries.length && <tr><td colSpan="6" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <div className="content-grid instance-grid">
      <section className="panel full-panel"><SectionErrors errors={errors} keys={["sessions"]}/><div className="panel-heading"><div><h3>Sesiones activas</h3><p>Conexiones de usuario observadas en la instancia.</p></div><span className="table-count">{data.sessions.length}</span></div>
        <div className="table-scroll"><table><thead><tr><th>ID</th><th>LOGIN</th><th>BASE</th><th>ESTADO</th><th>COMANDO</th><th>DURACIÓN</th></tr></thead><tbody>
          {data.sessions.map((item) => <tr key={item.sesion_id}><td>{item.sesion_id}</td><td>{item.login || '—'}</td><td>{item.base_de_datos || '—'}</td><td>{item.estado || '—'}</td><td>{item.comando || 'Inactiva'}</td><td>{formatMs(item.duracion_ms)}</td></tr>)}
          {!data.sessions.length && <tr><td colSpan="6" className="empty-cell">{emptyMessage}</td></tr>}
        </tbody></table></div>
      </section>
      <section className="panel full-panel"><SectionErrors errors={errors} keys={["blocked"]}/><div className="panel-heading"><div><h3>Bloqueos activos</h3><p>Sesiones que esperan a otra sesión.</p></div><span className={`status-label ${data.blocked.length ? 'bad' : state === 'online' && !errors.blocked ? 'good' : 'neutral'}`}><i/>{state === 'online' && !errors.blocked ? data.blocked.length ? `${data.blocked.length} bloqueos` : 'Sin bloqueos' : '—'}</span></div>
        {data.blocked.length ? <div className="table-scroll"><table><thead><tr><th>BLOQUEADA</th><th>BLOQUEADORA</th><th>ESPERA</th><th>TIPO</th><th>BASE</th></tr></thead><tbody>{data.blocked.map((item) => <tr key={item.sesion_bloqueada}><td>{item.sesion_bloqueada}</td><td>{item.sesion_bloqueadora}</td><td>{formatMs(item.espera_ms)}</td><td>{item.tipo_espera || '—'}</td><td>{item.base_de_datos || '—'}</td></tr>)}</tbody></table></div> : <div className="empty-state">{state === 'online' && !errors.blocked ? 'No se detectan sesiones bloqueadas.' : emptyMessage}</div>}
      </section>
    </div>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["resources"]}/><div className="panel-heading"><div><h3>Consumo por sesión</h3><p>Sesiones de usuario ordenadas por CPU acumulada.</p></div><span className="table-count">{data.resources.length} sesiones</span></div>
      <div className="table-scroll"><table><thead><tr><th>ID</th><th>LOGIN</th><th>PROGRAMA</th><th>CPU</th><th>MEMORIA</th><th>LECTURAS</th><th>ESTADO</th></tr></thead><tbody>
        {data.resources.map((item) => <tr key={item.sesion_id}><td>{item.sesion_id}</td><td>{item.login || '—'}</td><td>{item.programa || '—'}</td><td>{formatMs(item.cpu_ms)}</td><td>{formatMemory(item.memoria_kb)}</td><td>{Number(item.lecturas_logicas || 0).toLocaleString('es-CR')}</td><td>{item.estado || '—'}</td></tr>)}
        {!data.resources.length && <tr><td colSpan="7" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <div className="last-updated"><span className="live-dot"/>{updatedAt ? `Datos consultados ${updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}` : 'Los datos provienen de las DMVs de SQL Server; las estadísticas dependen de la caché actual.'}</div>
  </>;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
}

function BackupPage({ data, state, error, updatedAt, onRefresh, errors = {} }) {
  const latest = data.last;
  const emptyMessage = state === 'loading' ? 'Consultando SQL Server…' : 'No hay respaldos registrados para la base activa.';
  return <>
    <PageTitle eyebrow="MÓDULO 04 · PROTECCIÓN" title="Respaldo y recuperación" description="Historial de respaldos completados y operaciones que están activas." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    <SectionErrors errors={errors} keys={["last"]}/>
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar los respaldos</b><small>{error} Comprueba la conexión y los permisos de lectura sobre msdb.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Último respaldo" value={state === 'online' && !errors.last && latest ? formatDateTime(latest.fecha_fin) : state === 'online' && !errors.last ? 'Sin registros' : '—'} detail={latest ? `${latest.tipo_respaldo} · ${formatBytesMb(latest.tamano_mb)}` : 'Historial de la base activa en msdb'} icon="clock" tone="violet" />
      <MetricCard label="Respaldos completados" value={state === 'online' && !errors.history ? data.history.length.toLocaleString('es-CR') : '—'} detail="Últimos 50 registros disponibles" icon="database" tone="teal" />
      <MetricCard label="Operaciones activas" value={state === 'online' && !errors.active ? data.active.length.toLocaleString('es-CR') : '—'} detail="Respaldos en ejecución ahora" icon="pulse" tone="amber" />
      <MetricCard label="Estado del último" value={state === 'online' && !errors.last ? latest ? 'Completado' : 'Sin datos' : '—'} detail={latest ? formatDateTime(latest.fecha_inicio) : 'Se muestran solo respaldos finalizados'} icon="shield" tone="blue" />
    </div>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["history"]}/><div className="panel-heading"><div><h3>Historial de respaldos</h3><p>Registros completados que SQL Server conserva en msdb.</p></div><span className="table-count">{data.history.length} registros</span></div>
      <div className="table-scroll"><table><thead><tr><th>FECHA</th><th>TIPO</th><th>ESTADO</th><th>TAMAÑO</th><th>DURACIÓN</th><th>DESTINO</th></tr></thead><tbody>
        {data.history.map((item) => <tr key={item.id}><td>{formatDateTime(item.fecha_fin || item.fecha_inicio)}</td><td>{item.tipo_respaldo || '—'}</td><td><span className="status-label good"><i/>{item.estado || 'Completado'}</span></td><td>{formatBytesMb(item.tamano_mb)}</td><td>{item.duracion_segundos == null ? '—' : `${Number(item.duracion_segundos).toLocaleString('es-CR')} s`}</td><td title={item.destino || ''}>{item.destino || 'Destino no registrado'}</td></tr>)}
        {!data.history.length && <tr><td colSpan="6" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["active"]}/><div className="panel-heading"><div><h3>Respaldos en ejecución</h3><p>Progreso reportado por solicitudes BACKUP activas.</p></div><span className="table-count">{data.active.length} activos</span></div>
      <div className="table-scroll"><table><thead><tr><th>SESIÓN</th><th>BASE</th><th>COMANDO</th><th>INICIO</th><th>PROGRESO</th><th>TIEMPO ESTIMADO</th></tr></thead><tbody>
        {data.active.map((item) => <tr key={item.id_sesion}><td>{item.id_sesion}</td><td>{item.base_de_datos || '—'}</td><td>{item.comando || '—'}</td><td>{formatDateTime(item.fecha_inicio)}</td><td>{Number(item.porcentaje_completado || 0).toLocaleString('es-CR', { maximumFractionDigits: 1 })}%</td><td>{item.milisegundos_estimados == null ? '—' : formatMs(item.milisegundos_estimados)}</td></tr>)}
        {!data.active.length && <tr><td colSpan="6" className="empty-cell">{state === 'online' ? 'No hay respaldos en ejecución.' : emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <div className="footnote"><Icon name="shield" size={14}/> El historial muestra los respaldos reales que están registrados en msdb; SQL Server Express requiere ejecutar los respaldos manualmente.</div>
    {updatedAt && <div className="last-updated"><span className="live-dot"/>Actualizado {updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</div>}
  </>;
}

function AuditPage({ data, state, error, updatedAt, onRefresh, errors = {} }) {
  const [section, setSection] = useState('usuarios');
  const sections = [
    ['usuarios', 'Usuarios'], ['roles', 'Roles'], ['privilegios', 'Privilegios'], ['objetos', 'Objetos problemáticos'],
  ];
  const findings = data.problematic?.datos || [];
  const permissions = data.privileges?.datos || [];
  const emptyMessage = state === 'loading' ? 'Consultando metadatos de SQL Server…' : 'No hay registros para mostrar.';

  return <>
    <PageTitle eyebrow="MÓDULO 05 · CONTROL DE ACCESO" title="Auditoría" description="Inventario de usuarios, roles, asignaciones de permisos y objetos que requieren revisión." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible completar la auditoría</b><small>{error} Comprueba VIEW DEFINITION y VIEW SECURITY DEFINITION para cine_app.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Usuarios registrados" value={state === 'online' && !errors.users ? data.users.length.toLocaleString('es-CR') : '—'} detail="Principales visibles en CineStream" icon="server" tone="violet" />
      <MetricCard label="Roles de base de datos" value={state === 'online' && !errors.roles ? data.roles.length.toLocaleString('es-CR') : '—'} detail="Incluye roles fijos y de aplicación" icon="shield" tone="teal" />
      <MetricCard label="Asignaciones listadas" value={state === 'online' && !errors.privileges ? permissions.length.toLocaleString('es-CR') : '—'} detail="No equivale a permisos efectivos" icon="settings" tone="amber" />
      <MetricCard label="Hallazgos de objetos" value={state === 'online' && !errors.problematic ? findings.length.toLocaleString('es-CR') : '—'} detail={data.problematic ? `${data.problematic.cobertura?.objetos_revisados || 0} objetos revisados` : 'Diagnóstico de metadatos'} icon="pulse" tone="blue" />
    </div>
    <section className="panel full-panel">
      <div className="panel-heading"><div><h3>Inventario administrativo</h3><p>La auditoría presenta asignaciones y diagnósticos observados en la base actual.</p></div><span className="small-badge">{data.users[0]?.base_de_datos || data.roles[0]?.base_de_datos || 'CineStream'}</span></div>
      <SectionErrors errors={errors} keys={[({ usuarios: 'users', roles: 'roles', privilegios: 'privileges', objetos: 'problematic' })[section]]}/>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0 12px' }} role="tablist" aria-label="Secciones de auditoría">
        {sections.map(([id, label]) => <button key={id} type="button" className="button secondary" style={section === id ? { background: '#f3eefb', borderColor: '#7c3aed', color: '#5c2b2e' } : undefined} role="tab" aria-selected={section === id} onClick={() => setSection(id)}>{label}</button>)}
      </div>
      {section === 'usuarios' && <div className="table-scroll"><table><thead><tr><th>USUARIO</th><th>TIPO</th><th>AUTENTICACIÓN</th><th>ESQUEMA</th><th>CREADO</th></tr></thead><tbody>
        {data.users.map((item) => <tr key={item.usuario_id}><td><b>{item.nombre}</b></td><td>{item.tipo || '—'}</td><td>{item.autenticacion || '—'}</td><td>{item.esquema_predeterminado || '—'}</td><td>{formatDateTime(item.fecha_creacion)}</td></tr>)}
        {!data.users.length && <tr><td colSpan="5" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>}
      {section === 'roles' && <div className="table-scroll"><table><thead><tr><th>ROL</th><th>TIPO</th><th>FIJO</th><th>PROPIETARIO</th><th>MIEMBROS EXPLÍCITOS</th></tr></thead><tbody>
        {data.roles.map((item) => <tr key={item.rol_id}><td><b>{item.nombre}</b></td><td>{item.es_rol_aplicacion ? 'Aplicación' : 'Base de datos'}</td><td>{item.es_fijo ? 'Sí' : 'No'}</td><td>{item.propietario || '—'}</td><td title={(item.miembros || []).map((member) => member.nombre).join(', ')}>{(item.miembros || []).length ? item.miembros.map((member) => member.nombre).join(', ') : item.membresia_implicita ? 'Todos por public' : 'Sin asignaciones'}</td></tr>)}
        {!data.roles.length && <tr><td colSpan="5" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>}
      {section === 'privilegios' && <><div className="table-scroll"><table><thead><tr><th>BENEFICIARIO</th><th>ORIGEN</th><th>PERMISO</th><th>ESTADO</th><th>RECURSO</th><th>COLUMNA</th></tr></thead><tbody>
        {permissions.map((item, index) => <tr key={`${item.principal_id}-${item.permiso}-${index}`}><td>{item.beneficiario || item.otorgado_a || 'Sin beneficiario'}</td><td>{item.origen || '—'}{item.ruta_roles?.length ? ` · ${item.ruta_roles.join(' → ')}` : ''}</td><td><b>{item.permiso || '—'}</b></td><td>{item.estado || '—'}</td><td>{item.recurso || item.clase || '—'}</td><td>{item.columna || '—'}</td></tr>)}
        {!permissions.length && <tr><td colSpan="6" className="empty-cell">{state === 'online' ? 'No hay asignaciones explícitas registradas.' : emptyMessage}</td></tr>}
      </tbody></table></div><div className="notice"><Icon name="shield" size={15}/><span>{data.privileges?.advertencias?.[0] || 'El inventario muestra asignaciones visibles, no calcula permisos efectivos.'}</span></div></>}
      {section === 'objetos' && <><div className="table-scroll"><table><thead><tr><th>OBJETO</th><th>TIPO</th><th>CATEGORÍA</th><th>DIAGNÓSTICO</th></tr></thead><tbody>
        {findings.map((item, index) => <tr key={`${item.objeto_id}-${item.codigo}-${index}`}><td><b>{item.nombre_calificado || `[${item.esquema}].[${item.objeto}]`}</b></td><td>{item.tipo || '—'}</td><td>{item.categoria || '—'}</td><td title={item.mensaje || ''}>{item.codigo || item.mensaje || '—'}</td></tr>)}
        {!findings.length && <tr><td colSpan="4" className="empty-cell">{state === 'online' && !errors.problematic ? 'No se detectaron objetos con problemas en el alcance revisado.' : emptyMessage}</td></tr>}
      </tbody></table></div><div className="notice"><Icon name="shield" size={15}/><span>{data.problematic?.advertencias?.[0] || 'Sin hallazgos no garantiza ausencia de errores de ejecución.'} Cobertura: {data.problematic?.cobertura?.objetos_revisados ?? '—'} revisados; {data.problematic?.cobertura?.objetos_no_evaluables ?? '—'} no evaluables.</span></div></>}
    </section>
    {updatedAt && <div className="last-updated"><span className="live-dot"/>Auditoría actualizada {updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</div>}
  </>;
}

function MaintenancePage({ data, state, error, updatedAt, onRefresh, errors = {} }) {
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState(null);
  const statistics = data.statistics?.datos || [];
  const summary = data.statistics?.resumen;
  const invalid = data.invalid?.datos || [];
  const tables = [...new Map(statistics.map((item) => [`${item.esquema}.${item.tabla}`, {
    esquema: item.esquema,
    tabla: item.tabla,
    estadisticas: statistics.filter((stat) => stat.esquema === item.esquema && stat.tabla === item.tabla).length,
    recomendacion: statistics.some((stat) => stat.esquema === item.esquema && stat.tabla === item.tabla && stat.recomendacion === 'ACTUALIZAR') ? 'ACTUALIZAR'
      : statistics.some((stat) => stat.esquema === item.esquema && stat.tabla === item.tabla && stat.recomendacion === 'REVISAR') ? 'REVISAR' : 'AL_DIA',
  }])).values()];
  const emptyMessage = state === 'loading' ? 'Consultando SQL Server…' : 'No hay registros para mostrar.';

  const runAction = async (endpoint, payload, confirmation) => {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setAction(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.mensaje || 'La acción no se pudo completar.');
      setAction({ ok: !['ERROR', 'PARCIAL'].includes(result.resultado), mensaje: result.mensaje || 'Acción completada.' });
      await onRefresh();
    } catch (err) {
      setAction({ ok: false, mensaje: err.message || 'La acción no se pudo completar.' });
    } finally {
      setBusy(false);
    }
  };

  return <>
    <PageTitle eyebrow="MÓDULO 06 · MANTENIMIENTO" title="Mantenimiento preventivo" description="Recomendaciones de estadísticas, objetos inválidos y resultado de acciones ejecutadas." right={<button className="button secondary" onClick={onRefresh} disabled={busy}><Icon name="refresh" size={15}/>Actualizar</button>} />
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar el mantenimiento</b><small>{error} Comprueba que el script 07 esté instalado y cine_app tenga los permisos requeridos.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    {action && <div className={`alert ${action.ok ? '' : 'error'}`} role="status"><span>{action.ok ? '✓' : '!'}</span><div><b>{action.ok ? 'Resultado de mantenimiento' : 'La acción requiere atención'}</b><small>{action.mensaje}</small></div></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Estadísticas evaluadas" value={state === 'online' && !errors.statistics ? Number(summary?.total || 0).toLocaleString('es-CR') : '—'} detail="Estadísticas de tablas de usuario" icon="database" tone="violet" />
      <MetricCard label="Requieren actualización" value={state === 'online' && !errors.statistics ? Number(summary?.actualizar || 0).toLocaleString('es-CR') : '—'} detail="Nunca calculadas o con cambios relevantes" icon="pulse" tone="amber" />
      <MetricCard label="Para revisar" value={state === 'online' && !errors.statistics ? Number(summary?.revisar || 0).toLocaleString('es-CR') : '—'} detail="Cambios y antigüedad sobre el umbral" icon="clock" tone="blue" />
      <MetricCard label="Objetos inválidos" value={state === 'online' && !errors.invalid ? Number(data.invalid?.total || 0).toLocaleString('es-CR') : '—'} detail="Procedimientos, vistas, funciones y triggers" icon="settings" tone="teal" />
    </div>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["statistics"]}/><div className="panel-heading"><div><h3>Estadísticas por tabla</h3><p>{summary?.criterio || 'El backend evalúa la antigüedad y el porcentaje de filas modificadas.'}</p></div><span className="table-count">{tables.length} tablas</span></div>
      <div className="table-scroll"><table><thead><tr><th>TABLA</th><th>ESTADÍSTICAS</th><th>RECOMENDACIÓN</th><th>ACCIÓN</th></tr></thead><tbody>
        {tables.map((item) => <tr key={`${item.esquema}.${item.tabla}`}><td><b>[{item.esquema}].[{item.tabla}]</b></td><td>{item.estadisticas}</td><td><span className={`status-label ${item.recomendacion === 'ACTUALIZAR' ? 'bad' : item.recomendacion === 'REVISAR' ? 'neutral' : 'good'}`}><i/>{item.recomendacion}</span></td><td><button className="text-button" disabled={busy || state !== 'online'} onClick={() => runAction('/api/mantenimiento/estadisticas/actualizar', { esquema: item.esquema, tabla: item.tabla, modo: 'MUESTREO' }, `Actualizar estadísticas de ${item.esquema}.${item.tabla} con muestreo?`)}>Actualizar</button></td></tr>)}
        {!tables.length && <tr><td colSpan="4" className="empty-cell">{emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["invalid"]}/><div className="panel-heading"><div><h3>Objetos que requieren atención</h3><p>Diagnóstico de módulos con referencias inexistentes o errores de compilación.</p></div><button className="button secondary" disabled={busy || state !== 'online' || !invalid.length} onClick={() => runAction('/api/mantenimiento/objetos/recompilar', { todos: true }, `Intentar recompilar los ${invalid.length} objetos detectados?`)}>Recompilar detectados</button></div>
      <div className="table-scroll"><table><thead><tr><th>OBJETO</th><th>TIPO</th><th>PROBLEMA</th><th>DETALLE</th><th>ACCIÓN</th></tr></thead><tbody>
        {invalid.map((item, index) => <tr key={`${item.esquema}.${item.objeto}.${index}`}><td><b>[{item.esquema}].[{item.objeto}]</b></td><td>{item.tipo || '—'}</td><td>{item.problema || '—'}</td><td title={item.detalle || ''}>{item.detalle || '—'}</td><td><button className="text-button" disabled={busy || state !== 'online'} onClick={() => runAction('/api/mantenimiento/objetos/recompilar', { esquema: item.esquema, objeto: item.objeto }, `Intentar recompilar [${item.esquema}].[${item.objeto}]?`)}>Recompilar</button></td></tr>)}
        {!invalid.length && <tr><td colSpan="5" className="empty-cell">{state === 'online' && !errors.invalid ? 'No se detectaron objetos inválidos.' : emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel full-panel"><SectionErrors errors={errors} keys={["history"]}/><div className="panel-heading"><div><h3>Bitácora de mantenimiento</h3><p>Acciones anteriores con resultado informado por SQL Server.</p></div><span className="table-count">{data.history.length} acciones</span></div>
      <div className="table-scroll"><table><thead><tr><th>FECHA</th><th>OPERACIÓN</th><th>OBJETO</th><th>RESULTADO</th><th>MENSAJE</th><th>DURACIÓN</th></tr></thead><tbody>
        {data.history.map((item) => <tr key={item.id_bitacora}><td>{formatDateTime(item.fecha)}</td><td>{item.operacion}</td><td>{item.objeto || '—'}</td><td>{item.resultado}</td><td title={item.mensaje || ''}>{item.mensaje || '—'}</td><td>{formatMs(item.duracion_ms)}</td></tr>)}
        {!data.history.length && <tr><td colSpan="6" className="empty-cell">{state === 'online' ? 'Todavía no hay acciones registradas.' : emptyMessage}</td></tr>}
      </tbody></table></div>
    </section>
    <div className="notice"><Icon name="shield" size={15}/><span>Las acciones requieren confirmación y se ejecutan mediante procedimientos del esquema cineadmin. El resultado aparece aquí y queda en la bitácora.</span></div>
    {updatedAt && <div className="last-updated"><span className="live-dot"/>Estado consultado {updatedAt.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}</div>}
  </>;
}

export default function App() {
  const [active, setActive] = useState('overview');
  const instance = useInstanceData();
  const storage = useStorageData(active === 'storage');
  const performance = usePerformanceData(active === 'performance');
  const backups = useBackupData(active === 'backup');
  const audit = useAuditData(active === 'audit');
  const maintenance = useMaintenanceData(active === 'maintenance');
  const visible = ({ storage, performance, backup: backups, audit, maintenance })[active] || instance;
  const props = { ...visible, onRefresh: visible.refresh };
  const instanceState = instance.state === 'online' && instance.partial ? 'partial' : instance.state;
  return <div className="app-shell"><Sidebar active={active} onSelect={setActive} state={instanceState}/><main className="main-area">
    <Header title={moduleNames[active]} state={visible.state} instanceState={instanceState} partial={visible.partial} updatedAt={visible.updatedAt} onRefresh={visible.refresh}/>
    <div className="page-content">
      {active === 'overview' && <Overview {...props} onSelect={setActive}/>}
      {active === 'instance' && <InstancePage {...props}/>}
      {active === 'storage' && <StoragePage {...props}/>}
      {active === 'performance' && <PerformancePage {...props}/>}
      {active === 'backup' && <BackupPage {...props}/>}
      {active === 'audit' && <AuditPage {...props}/>}
      {active === 'maintenance' && <MaintenancePage {...props}/>}
    </div>
  </main></div>;
}
