import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

import { baseOptions } from '@/lib/layout.shared';

export default function HomeShell({ children }: { children: ReactNode }) {
  const base = baseOptions();

  return (
    <HomeLayout
      {...base}
      nav={{
        ...base.nav,
        transparentMode: 'top',
      }}
    >
      {children}
    </HomeLayout>
  );
}
