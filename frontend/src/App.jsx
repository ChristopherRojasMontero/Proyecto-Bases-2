import { useCallback, useEffect, useMemo, useState } from 'react';

const modules = [
  { id: 'overview', label: 'Vista general', icon: '◫', endpoint: null },
  { id: 'instance', label: 'Estado de instancia', icon: '◉', endpoint: '/api/instancia' },
  { id: 'performance', label: 'Rendimiento', icon: '⌁', endpoint: '/api/rendimiento' },
  { id: 'storage', label: 'Almacenamiento', icon: '▤', endpoint: '/api/almacenamiento' },
  { id: 'backup', label: 'Respaldo y recuperación', icon: '⟲', endpoint: '/api/respaldo' },
  { id: 'audit', label: 'Auditoría', icon: '◎', endpoint: '/api/auditoria' },
  { id: 'maintenance', label: 'Mantenimiento', icon: '✳', endpoint: '/api/mantenimiento' },
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

function useInstanceData() {
  const [data, setData] = useState({ version: null, uptime: null, databases: [], configuration: [] });
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const endpoints = ['version', 'uptime', 'bases-datos', 'configuracion'];
      const responses = await Promise.all(endpoints.map(async (endpoint) => {
        const response = await fetch(`/api/instancia/${endpoint}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.mensaje || `No se pudo consultar ${endpoint}.`);
        return body;
      }));
      setData({ version: responses[0], uptime: responses[1], databases: responses[2], configuration: responses[3] });
      setUpdatedAt(new Date());
      setState('online');
    } catch (err) {
      setError(err.message || 'No se pudo conectar con la API.');
      setState('offline');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, state, error, updatedAt, refresh };
}

function useStorageData(enabled) {
  const [data, setData] = useState({ filegroups: [], size: [], objects: [], growth: [] });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState('loading');
    setError('');
    try {
      const endpoints = ['filegroups', 'tamano', 'objetos-grandes', 'crecimiento'];
      const results = await Promise.all(endpoints.map(async (endpoint) => {
        const response = await fetch(`/api/almacenamiento/${endpoint}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.mensaje || `No se pudo consultar ${endpoint}.`);
        return body;
      }));
      setData({ filegroups: results[0], size: results[1], objects: results[2], growth: results[3] });
      setState('online');
    } catch (err) {
      setError(err.message || 'No se pudo consultar el almacenamiento.');
      setState('offline');
    }
  }, [enabled]);

  useEffect(() => { if (enabled) refresh(); }, [enabled, refresh]);
  return { data, state, error, refresh };
}

function Header({ title, state, updatedAt, onRefresh }) {
  return <header className="topbar">
    <div className="breadcrumbs"><span>CINEADMIN</span><Icon name="chevron" size={13}/><strong>{title}</strong></div>
    <div className="topbar-actions">
      <span className={`connection-pill ${state}`}><i />{state === 'online' ? 'Instancia conectada' : state === 'loading' ? 'Consultando instancia' : 'Sin conexión'}</span>
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
      {modules.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
        <span className="nav-icon">{item.id === 'overview' ? item.icon : <Icon name={item.id === 'instance' ? 'server' : item.id === 'performance' ? 'pulse' : item.id === 'storage' ? 'database' : item.id === 'backup' ? 'refresh' : item.id === 'audit' ? 'shield' : 'settings'} size={17}/>}</span>
        <span>{item.label}</span>
        {['performance', 'backup', 'audit', 'maintenance'].includes(item.id) && <span className="soon-dot" title="Módulo en integración"/>}
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

function Overview({ data, state, error, onSelect, onRefresh, updatedAt }) {
  const userDbs = data.databases.filter((db) => !['master', 'model', 'msdb', 'tempdb'].includes(db.base_de_datos.toLowerCase()));
  const onlineUserCount = userDbs.filter((db) => db.estado === 'ONLINE').length;
  const totalSize = userDbs.reduce((total, db) => total + Number(db.tamano_mb || 0), 0);
  const serverMemory = data.configuration.find((item) => item.parametro === 'max server memory (MB)');
  const memory = serverMemory && Number(serverMemory.valor_actual) < 2147483647 ? formatBytesMb(serverMemory.valor_actual) : 'Sin límite';
  const topDb = [...userDbs].sort((a, b) => Number(b.tamano_mb) - Number(a.tamano_mb)).slice(0, 5);
  const largest = Math.max(...topDb.map((db) => Number(db.tamano_mb) || 0), 1);

  return <>
    <PageTitle eyebrow="PANORAMA DEL SISTEMA" title="Vista general" description="Un resumen operativo de la instancia y sus bases de datos." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar datos</button>} />
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar la instancia</b><small>{error} Inicia el backend y revisa su archivo <code>.env</code>.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <section className="hero-card">
      <div className="hero-copy"><div className="hero-kicker"><span className="live-dot"/>ESTADO DE LA INSTANCIA</div><h2>{state === 'online' ? 'Todo está en orden.' : state === 'loading' ? 'Conectando con SQL Server…' : 'Instancia sin conexión'}</h2><p>{state === 'online' ? 'La API respondió a las consultas administrativas.' : state === 'loading' ? 'Consultando información real del motor.' : 'No hay datos disponibles hasta recuperar la conexión.'}</p><button className="hero-link" onClick={() => onSelect('instance')}>Ver estado de instancia <Icon name="arrow" size={15}/></button></div>
      <div className="hero-visual"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-db"><Icon name="database" size={27}/></div><div className="orbit-node node-a"/><div className="orbit-node node-b"/><div className="orbit-node node-c"/></div>
      <div className="hero-meta"><div><small>SERVIDOR</small><b>{data.version?.servidor || '—'}</b></div><div><small>MOTOR</small><b>{data.version?.edicion?.replace(' Edition (64-bit)', '') || 'SQL Server'}</b></div><div><small>VERSIÓN</small><b>{data.version?.version || '—'}</b></div></div>
    </section>
    <div className="metrics-grid">
      <MetricCard label="Tiempo activo" value={data.uptime ? formatUptime(data.uptime.minutos_activo) : '—'} detail={data.uptime?.inicio ? `Desde ${new Date(data.uptime.inicio).toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Último inicio de instancia'} icon="clock" tone="violet" />
      <MetricCard label="Bases de datos" value={state === 'online' ? userDbs.length : '—'} detail={state === 'online' ? `${onlineUserCount} bases de usuario en línea` : 'Esperando información del motor'} icon="database" tone="teal" />
      <MetricCard label="Almacenamiento actual" value={state === 'online' ? formatBytesMb(totalSize) : '—'} detail="Suma de bases de usuario · datos y log" icon="memory" tone="amber" />
      <MetricCard label="Memoria máx. configurada" value={state === 'online' ? memory : '—'} detail="Configuración del motor SQL Server" icon="server" tone="blue" />
    </div>
    <div className="content-grid overview-grid">
      <section className="panel database-panel"><div className="panel-heading"><div><h3>Bases de datos</h3><p>Estado y tamaño actual reportado por la instancia</p></div><button className="text-button" onClick={() => onSelect('instance')}>Ver todas <Icon name="chevron" size={14}/></button></div>
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

function InstancePage({ data, state, error, onRefresh }) {
  const startDate = data.uptime?.inicio ? new Date(data.uptime.inicio) : null;
  const parameters = useMemo(() => Object.fromEntries(data.configuration.map((item) => [item.parametro, item])), [data.configuration]);
  return <>
    <PageTitle eyebrow="MÓDULO 01 · MONITOREO" title="Estado de instancia" description="Identidad, disponibilidad y configuración general del motor SQL Server." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>Sin conexión con SQL Server</b><small>{error} Comprueba el backend y las variables de conexión.</small></div></div>}
    <section className="instance-banner"><div className="instance-symbol"><Icon name="server" size={23}/></div><div className="instance-info"><div className="instance-title"><h2>{data.version?.servidor || 'Instancia SQL Server'}</h2><span className={`status-label ${state === 'online' ? 'good' : state === 'loading' ? 'neutral' : 'bad'}`}><i/>{state === 'online' ? 'OPERATIVA' : state === 'loading' ? 'CONSULTANDO' : 'SIN CONEXIÓN'}</span></div><p>{data.version?.edicion || 'Microsoft SQL Server'}{data.version?.version ? ` · Versión ${data.version.version}` : ''}{data.version?.nivel_parche ? ` · ${data.version.nivel_parche}` : ''}</p></div><div className="instance-tag"><small>TIPO DE MOTOR</small><b>Microsoft SQL Server</b></div></section>
    <div className="metrics-grid instance-metrics"><MetricCard label="Tiempo activa" value={data.uptime ? formatUptime(data.uptime.minutos_activo) : '—'} detail="Desde el último arranque del servicio" icon="clock" tone="violet"/><MetricCard label="Bases administradas" value={state === 'online' ? data.databases.length : '—'} detail="Incluye bases del sistema" icon="database" tone="teal"/><MetricCard label="Bases en línea" value={state === 'online' ? data.databases.filter((db) => db.estado === 'ONLINE').length : '—'} detail="Estado reportado por sys.databases" icon="pulse" tone="blue"/><MetricCard label="Memoria máxima" value={parameters['max server memory (MB)'] ? (Number(parameters['max server memory (MB)'].valor_actual) >= 2147483647 ? 'Sin límite' : formatBytesMb(parameters['max server memory (MB)'].valor_actual)) : '—'} detail="Límite máximo configurado en el motor" icon="memory" tone="amber"/></div>
    <div className="content-grid instance-grid">
      <section className="panel"><div className="panel-heading"><div><h3>Información del motor</h3><p>Identificación y último inicio de la instancia</p></div><span className="small-badge">EN VIVO</span></div><div className="detail-list"><div><span>Servidor / instancia</span><b>{data.version?.servidor || '—'}</b></div><div><span>Sistema gestor</span><b>Microsoft SQL Server</b></div><div><span>Edición</span><b>{data.version?.edicion || '—'}</b></div><div><span>Versión del producto</span><b>{data.version?.version || '—'}</b></div><div><span>Nivel de actualización</span><b>{data.version?.nivel_parche || '—'}</b></div><div><span>Inicio de instancia</span><b>{startDate ? startDate.toLocaleString('es-CR', { dateStyle: 'long', timeStyle: 'short' }) : '—'}</b></div></div></section>
      <section className="panel"><div className="panel-heading"><div><h3>Memoria y paralelismo</h3><p>Parámetros efectivos de configuración</p></div><span className="panel-icon"><Icon name="settings" size={16}/></span></div><div className="config-list">{data.configuration.map((item) => <div className="config-row" key={item.parametro}><div><b>{item.parametro}</b><small>{item.descripcion}</small></div><div><span>{Number(item.valor_actual) >= 2147483647 && item.parametro.includes('memory') ? 'Sin límite' : Number(item.valor_actual).toLocaleString('es-CR')}{item.parametro.includes('memory') && Number(item.valor_actual) < 2147483647 ? ' MB' : ''}</span><small>actual</small></div></div>)}</div><div className="notice"><Icon name="memory" size={15}/><span>SQL Server expone aquí los límites configurados; el uso real de memoria requiere una métrica adicional del backend.</span></div></section>
    </div>
    <section className="panel full-panel"><div className="panel-heading"><div><h3>Bases de datos de la instancia</h3><p>Inventario completo con estado y tamaño actual de archivos de datos y log.</p></div><span className="table-count">{state === 'online' ? `${data.databases.length} bases` : '—'}</span></div>
      <div className="table-scroll"><table><thead><tr><th>BASE DE DATOS</th><th>ESTADO</th><th>MODELO DE RECUPERACIÓN</th><th>FECHA DE CREACIÓN</th><th className="align-right">TAMAÑO</th></tr></thead><tbody>{data.databases.map((db) => <tr key={db.base_de_datos}><td><span className="table-db-icon"><Icon name="database" size={15}/></span><b>{db.base_de_datos}</b></td><td><span className={`status-label ${db.estado === 'ONLINE' ? 'good' : 'bad'}`}><i/>{db.estado}</span></td><td><span className="mono-chip">{db.modelo_recuperacion}</span></td><td>{db.fecha_creacion ? new Date(db.fecha_creacion).toLocaleDateString('es-CR', { dateStyle: 'medium' }) : '—'}</td><td className="align-right size-cell">{formatBytesMb(db.tamano_mb)}</td></tr>)}{!data.databases.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' ? 'Consultando información…' : 'No hay resultados disponibles.'}</td></tr>}</tbody></table></div>
    </section>
    <div className="footnote"><Icon name="shield" size={14}/> La conexión se configura mediante el archivo <code>backend/.env</code>. Las credenciales no se guardan en el navegador.</div>
  </>;
}

function StoragePage({ data, state, error, onRefresh }) {
  const totalMb = data.size.reduce((sum, item) => sum + (Number(item.tamano_mb) || 0), 0);
  const totalUsedMb = data.filegroups.reduce((sum, item) => sum + (Number(item.usado_mb) || 0), 0);
  const largestObject = Math.max(...data.objects.map((item) => Number(item.tamano_total_mb) || 0), 1);
  const dataFiles = data.filegroups.filter((item) => item.type_desc === 'ROWS');
  const logFiles = data.filegroups.filter((item) => item.type_desc === 'LOG');
  return <>
    <PageTitle eyebrow="MÓDULO 03 · MONITOREO" title="Gestión del almacenamiento" description="Uso de archivos, filegroups, objetos de mayor tamaño y crecimiento configurado." right={<button className="button secondary" onClick={onRefresh}><Icon name="refresh" size={15}/>Actualizar</button>} />
    {state === 'offline' && <div className="alert error"><span>!</span><div><b>No fue posible consultar el almacenamiento</b><small>{error} Comprueba que el backend tenga registrada la ruta /api/almacenamiento.</small></div><button onClick={onRefresh}>Reintentar</button></div>}
    <div className="metrics-grid instance-metrics">
      <MetricCard label="Tamaño de archivos" value={state === 'online' ? formatBytesMb(totalMb) : '—'} detail="Suma de archivos de datos y log" icon="database" tone="violet"/>
      <MetricCard label="Espacio ocupado" value={state === 'online' ? formatBytesMb(totalUsedMb) : '—'} detail="Uso reportado por los archivos de datos y log" icon="memory" tone="teal"/>
      <MetricCard label="Archivos de datos" value={state === 'online' ? dataFiles.length : '—'} detail={state === 'online' ? `${formatBytesMb(dataFiles.reduce((n, item) => n + (Number(item.tamano_mb) || 0), 0))} asignados` : 'Tamaño actual'} icon="server" tone="blue"/>
      <MetricCard label="Archivos de log" value={state === 'online' ? logFiles.length : '—'} detail={state === 'online' ? `${formatBytesMb(logFiles.reduce((n, item) => n + (Number(item.tamano_mb) || 0), 0))} asignados` : 'Tamaño actual'} icon="pulse" tone="amber"/>
    </div>
    <div className="content-grid instance-grid">
      <section className="panel"><div className="panel-heading"><div><h3>Archivos y filegroups</h3><p>Espacio asignado, usado y libre en la base seleccionada</p></div><span className="small-badge">{state === 'online' ? `${data.filegroups.length} archivos` : 'EN VIVO'}</span></div>
        <div className="table-scroll"><table><thead><tr><th>FILEGROUP</th><th>ARCHIVO</th><th>TIPO</th><th className="align-right">ASIGNADO</th><th className="align-right">USADO</th><th className="align-right">LIBRE</th></tr></thead><tbody>{data.filegroups.map((item) => <tr key={item.archivo_logico}><td><span className="mono-chip">{item.filegroup || '—'}</span></td><td><b>{item.archivo_logico}</b></td><td>{item.type_desc}</td><td className="align-right size-cell">{formatBytesMb(item.tamano_mb)}</td><td className="align-right">{item.usado_mb == null ? '—' : formatBytesMb(item.usado_mb)}</td><td className="align-right">{item.libre_mb == null ? '—' : formatBytesMb(item.libre_mb)}</td></tr>)}{!data.filegroups.length && <tr><td colSpan="6" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando archivos…' : 'No hay archivos disponibles.'}</td></tr>}</tbody></table></div>
        <div className="panel-footnote">Los archivos de log no pertenecen a un filegroup; por eso pueden mostrar “—” en esa columna.</div>
      </section>
      <section className="panel"><div className="panel-heading"><div><h3>Tamaño por tipo de archivo</h3><p>Distribución actual de almacenamiento</p></div><span className="panel-icon"><Icon name="database" size={16}/></span></div>
        <div className="storage-bars">{data.size.map((item) => { const pct = totalMb ? Number(item.tamano_mb) / totalMb * 100 : 0; return <div className="storage-type" key={item.type_desc}><div className="storage-type-head"><span><i className={item.type_desc === 'LOG' ? 'log' : ''}/>{item.type_desc === 'ROWS' ? 'Datos' : item.type_desc === 'LOG' ? 'Registro de transacciones' : item.type_desc}</span><b>{formatBytesMb(item.tamano_mb)}</b></div><div className="storage-track"><i className={item.type_desc === 'LOG' ? 'log' : ''} style={{width:`${pct}%`}}/></div><small>{pct.toLocaleString('es-CR',{maximumFractionDigits:1})}% del tamaño total</small></div>; })}{!data.size.length && <div className="empty-state">{state === 'loading' || state === 'idle' ? 'Cargando resumen…' : 'Sin información de tamaños.'}</div>}</div>
        <div className="notice"><Icon name="pulse" size={15}/><span>El crecimiento histórico requiere registrar mediciones en distintos momentos. Esta vista muestra la configuración actual de autogrowth.</span></div>
      </section>
    </div>
    <section className="panel full-panel storage-objects"><div className="panel-heading"><div><h3>Objetos de mayor tamaño</h3><p>Tablas de usuario ordenadas por páginas asignadas, según la base configurada en la conexión.</p></div><span className="table-count">TOP 10</span></div>
      <div className="table-scroll"><table><thead><tr><th>TABLA</th><th className="align-right">FILAS</th><th>TAMAÑO ASIGNADO</th><th className="align-right">USADO</th><th>PROPORCIÓN</th></tr></thead><tbody>{data.objects.map((item) => {const pct=(Number(item.tamano_total_mb)||0)/largestObject*100; return <tr key={item.tabla}><td><span className="table-db-icon"><Icon name="database" size={14}/></span><b>{item.tabla}</b></td><td className="align-right">{Number(item.filas||0).toLocaleString('es-CR')}</td><td className="size-cell">{formatBytesMb(item.tamano_total_mb)}</td><td className="align-right">{formatBytesMb(item.tamano_usado_mb)}</td><td><div className="object-bar"><i style={{width:`${Math.max(2,pct)}%`}}/></div></td></tr>;})}{!data.objects.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando objetos…' : 'No hay tablas de usuario para mostrar.'}</td></tr>}</tbody></table></div>
    </section>
    <section className="panel full-panel growth-panel"><div className="panel-heading"><div><h3>Configuración de crecimiento</h3><p>Incremento automático y tamaño máximo configurado para cada archivo.</p></div><span className="panel-icon"><Icon name="pulse" size={16}/></span></div>
      <div className="table-scroll"><table><thead><tr><th>ARCHIVO LÓGICO</th><th>TIPO</th><th>TAMAÑO ACTUAL</th><th>AUTOGROWTH</th><th>TAMAÑO MÁXIMO</th></tr></thead><tbody>{data.growth.map((item) => <tr key={item.archivo_logico}><td><b>{item.archivo_logico}</b></td><td>{item.type_desc}</td><td className="size-cell">{formatBytesMb(item.tamano_actual_mb)}</td><td><span className="mono-chip">{item.incremento_autogrowth}</span></td><td>{item.tamano_maximo}</td></tr>)}{!data.growth.length && <tr><td colSpan="5" className="empty-cell">{state === 'loading' || state === 'idle' ? 'Consultando crecimiento…' : 'Sin configuración disponible.'}</td></tr>}</tbody></table></div>
    </section>
    <div className="footnote"><Icon name="shield" size={14}/> Consultas administrativas de solo lectura. Los resultados corresponden a la base seleccionada en <code>backend/.env</code>.</div>
  </>;
}

function PlaceholderPage({ module, onSelect }) {
  const isStorage = module.id === 'storage';
  const isAudit = module.id === 'audit';
  const available = isStorage || isAudit;
  return <>
    <PageTitle eyebrow={`MÓDULO · ${String(modules.filter((m) => m.id !== 'overview').findIndex((m) => m.id === module.id) + 1).padStart(2, '0')} · MONITOREO`} title={module.label} description={isStorage ? 'Supervisa el espacio asignado y el crecimiento de los archivos de datos.' : isAudit ? 'Consulta usuarios, roles, privilegios y objetos con posibles problemas.' : 'Esta vista está preparada para integrarse con su API cuando el módulo esté disponible.'}/>
    <section className="placeholder-card"><div className="placeholder-icon"><Icon name={isStorage ? 'database' : isAudit ? 'shield' : 'settings'} size={24}/></div><div className="eyebrow">{available ? 'API DISPONIBLE PARA INTEGRACIÓN' : 'MÓDULO EN DESARROLLO'}</div><h2>{available ? 'Conectemos este módulo.' : 'Esta vista se completará con su API.'}</h2><p>{isStorage ? 'El backend ya incluye rutas para filegroups, tamaño, objetos grandes y crecimiento. La vista todavía no consulta estos endpoints, así que no muestra valores ficticios.' : isAudit ? 'La rama de Persona 5 contiene endpoints de auditoría, pero todavía no están integrados en la rama actual. Por ahora, esta pantalla indica claramente su estado.' : 'Cuando la API correspondiente se integre al backend, aquí se mostrarán sus métricas reales obtenidas del gestor de base de datos.'}</p><div className="placeholder-meta"><span className="status-label neutral"><i/>{available ? 'Pendiente de conexión UI' : 'Pendiente de API'}</span>{module.endpoint && <code>{module.endpoint}/*</code>}</div><button className="button secondary" onClick={() => onSelect('overview')}>Volver a vista general <Icon name="chevron" size={14}/></button></section>
  </>;
}

export default function App() {
  const [active, setActive] = useState('overview');
  const { data, state, error, updatedAt, refresh } = useInstanceData();
  const storage = useStorageData(active === 'storage');
  const current = modules.find((module) => module.id === active) || modules[0];
  return <div className="app-shell"><Sidebar active={active} onSelect={setActive} state={state}/><main className="main-area"><Header title={moduleNames[active]} state={state} updatedAt={updatedAt} onRefresh={active === 'storage' ? storage.refresh : refresh}/><div className="page-content">{active === 'overview' ? <Overview data={data} state={state} error={error} onSelect={setActive} onRefresh={refresh} updatedAt={updatedAt}/> : active === 'instance' ? <InstancePage data={data} state={state} error={error} onRefresh={refresh}/> : active === 'storage' ? <StoragePage data={storage.data} state={storage.state} error={storage.error} onRefresh={storage.refresh}/> : <PlaceholderPage module={current} onSelect={setActive}/>}</div></main></div>;
}
