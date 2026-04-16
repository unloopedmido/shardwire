'use client';

import { useEffect, useId, useRef } from 'react';

function diagramTheme(): 'dark' | 'default' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

export type MermaidProps = {
  /** Mermaid source (without the ```mermaid fence). */
  chart: string;
};

/**
 * Renders a Mermaid diagram on the client. Fenced ```mermaid blocks in MDX are
 * not processed by the compiler — use this component instead.
 */
export function Mermaid({ chart }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replaceAll(':', '');
  const definition = chart.trim();

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${reactId}`;

    void (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: diagramTheme(),
        securityLevel: 'strict',
      });

      try {
        const { svg } = await mermaid.render(renderId, definition);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
      } catch (error) {
        if (cancelled || !containerRef.current) return;
        const message = error instanceof Error ? error.message : String(error);
        containerRef.current.textContent = `Diagram error: ${message}`;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition, reactId]);

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-xl border border-fd-border bg-fd-card p-4 [&_svg]:h-auto [&_svg]:max-w-full"
    />
  );
}
