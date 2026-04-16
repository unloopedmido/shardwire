import defaultComponents from 'fumadocs-ui/mdx';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';

import { Mermaid } from '@/components/mermaid';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultComponents,
    Step,
    Steps,
    Tab,
    Tabs,
    Mermaid,
    // TODO: Replace this fallback with a client-only/dynamic AutoTypeTable integration
    // once fumadocs-typescript UI is compatible with this Next server MDX build path.
    AutoTypeTable: () =>
      process.env.NODE_ENV === 'development' ? (
        <p>
          AutoTypeTable is temporarily disabled in this build. Run{' '}
          <code>npm run -w website reference:build</code> and check CI to verify
          availability.
        </p>
      ) : null,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
