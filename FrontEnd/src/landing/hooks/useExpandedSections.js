import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sitesense_dashboard_expanded_sections';

function loadInitial(ids, defaultExpanded) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      return Object.fromEntries(ids.map((id) => [id, id in stored ? Boolean(stored[id]) : defaultExpanded]));
    }
  } catch {
    // ignore malformed storage
  }
  return Object.fromEntries(ids.map((id) => [id, defaultExpanded]));
}

export function useExpandedSections(ids, { defaultExpanded = true } = {}) {
  const [expanded, setExpanded] = useState(() => loadInitial(ids, defaultExpanded));
  const [everExpanded, setEverExpanded] = useState(() => ({ ...loadInitial(ids, defaultExpanded) }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
  }, [expanded]);

  const setSection = useCallback((id, value) => {
    setExpanded((prev) => ({ ...prev, [id]: value }));
    if (value) setEverExpanded((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }, []);

  const toggle = useCallback((id) => setSection(id, !expanded[id]), [expanded, setSection]);

  const expandAll = useCallback(() => {
    setExpanded(Object.fromEntries(ids.map((id) => [id, true])));
    setEverExpanded(Object.fromEntries(ids.map((id) => [id, true])));
  }, [ids]);

  const collapseAll = useCallback(() => {
    setExpanded(Object.fromEntries(ids.map((id) => [id, false])));
  }, [ids]);

  const expandAndScrollTo = useCallback(
    (id) => {
      setSection(id, true);
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 260); // let the expand animation start before scrolling
      });
    },
    [setSection]
  );

  return { expanded, everExpanded, toggle, setSection, expandAll, collapseAll, expandAndScrollTo };
}
