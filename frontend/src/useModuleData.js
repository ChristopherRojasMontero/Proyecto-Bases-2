import { useCallback, useEffect, useRef, useState } from 'react';

// Cada sección conserva su contrato. Una sección fallida se vacía para no
// presentar datos antiguos como si acabaran de consultarse correctamente.
export async function loadSections(config, signal, fetcher = fetch) {
  const results = await Promise.allSettled(config.requests.map(async ([key, url, select]) => {
    const response = await fetcher(url, { signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.mensaje || 'No se pudo consultar esta sección.');
    return [key, select ? select(body) : body];
  }));
  const data = { ...config.initial };
  const errors = {};
  results.forEach((result, index) => {
    const key = config.requests[index][0];
    if (result.status === 'fulfilled') data[key] = result.value[1];
    else errors[key] = result.reason?.message || 'No se pudo consultar esta sección.';
  });
  return { data, errors, successes: results.filter((r) => r.status === 'fulfilled').length };
}

export function useModuleData(config, enabled = true) {
  const [data, setData] = useState(config.initial);
  const [state, setState] = useState(enabled ? 'loading' : 'idle');
  const [errors, setErrors] = useState({});
  const [updatedAt, setUpdatedAt] = useState(null);
  const request = useRef({ id: 0, controller: null });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = ++request.current.id;
    request.current.controller = controller;
    setState('loading');
    const result = await loadSections(config, controller.signal);
    if (controller.signal.aborted || id !== request.current.id) return;
    setData(result.data);
    setErrors(result.errors);
    // Las vistas existentes usan online para datos disponibles. Los errores
    // por sección y el indicador partial distinguen una respuesta incompleta.
    setState(result.successes ? 'online' : 'offline');
    setUpdatedAt(result.successes ? new Date() : null);
  }, [config, enabled]);

  useEffect(() => {
    if (enabled) refresh();
    return () => {
      request.current.id++;
      request.current.controller?.abort();
    };
  }, [enabled, refresh]);

  return { data, state, errors, partial: state === 'online' && Object.keys(errors).length > 0,
    error: [...new Set(Object.values(errors))].join(' '), updatedAt, refresh };
}
