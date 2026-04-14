'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

import { SiteSearchDialog } from '@/components/search-dialog';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog: SiteSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}
