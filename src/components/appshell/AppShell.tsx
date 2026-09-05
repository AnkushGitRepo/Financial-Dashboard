'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from './AppHeader';
import { AiWidget, sectionFromPathname } from './AiWidget';
import { MobileTabBar } from './MobileTabBar';
import { MaskProvider, useMask } from '@/lib/dashboard/MaskContext';
import styles from './AppShell.module.css';

function AppShellInner({ children }: { children: ReactNode }) {
  const { toggleMask } = useMask();
  const pathname = usePathname();
  const section = sectionFromPathname(pathname);

  return (
    <div className={styles.shell}>
      <AppHeader onToggleMask={toggleMask} />
      <main className={styles.main}>{children}</main>
      <AiWidget section={section} />
      <MobileTabBar />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <MaskProvider>
      <AppShellInner>{children}</AppShellInner>
    </MaskProvider>
  );
}
