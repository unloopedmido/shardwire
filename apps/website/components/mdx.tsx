import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultComponents,
    // Temporary fallback to keep Next production builds green when fumadocs-typescript UI
    // transitively imports unavailable fumadocs-ui internals in the server MDX pipeline.
    AutoTypeTable: () =>
      process.env.NODE_ENV === 'development' ? (
        <p>
          AutoTypeTable is temporarily disabled in this build. Run
          {' `npm run -w website reference:build` '}
          and check CI to verify availability.
        </p>
      ) : null,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
