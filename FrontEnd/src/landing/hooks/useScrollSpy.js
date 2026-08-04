import { useEffect, useRef, useState } from 'react';

// Tracks which registered section is "current" using a thin trigger band just
// below the fixed navbar. Sections here are much taller than the viewport,
// so comparing raw intersectionRatio (as a naive scrollspy would) unfairly
// favors short sections — a 2000px-tall section can never reach a high
// ratio in a 900px viewport. Instead we watch a thin band near the top and
// take the *last* (furthest-scrolled) section currently crossing it.
export function useScrollSpy(sectionIds) {
  const [activeId, setActiveId] = useState(sectionIds[0]);
  const intersecting = useRef(new Map());

  useEffect(() => {
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.current.set(entry.target.id, entry.isIntersecting);
        }
        let next = null;
        for (const id of sectionIds) {
          if (intersecting.current.get(id)) next = id;
        }
        if (next) setActiveId(next);
      },
      { threshold: 0, rootMargin: '-96px 0px -70% 0px' }
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIds.join('|')]);

  return activeId;
}

export function scrollToSection(id, { onBeforeScroll } = {}) {
  const element = document.getElementById(id);
  if (!element) return;
  onBeforeScroll?.();
  requestAnimationFrame(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
