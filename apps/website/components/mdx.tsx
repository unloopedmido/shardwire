import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultComponents,
    // Temporary fallback to keep Next production builds green when fumadocs-typescript UI
    // transitively imports unavailable fumadocs-ui internals in the server MDX pipeline.
    AutoTypeTable: () => null,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
