import type { ReactNode } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/landing/Logo';
import { FeatureCarousel } from './FeatureCarousel';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: ReactNode;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
}

export function AuthLayout({ children, switchPrompt, switchLabel, switchHref }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <div className={styles.formInner}>
          <div className={styles.logoRow}>
            <Link href="/">
              <Logo size={32} />
            </Link>
          </div>

          {children}

          <p className={styles.switchRow}>
            {switchPrompt} <Link href={switchHref}>{switchLabel}</Link>
          </p>

          <div className={styles.backRow}>
            <Link href="/" className={styles.backLink}>
              ← Back to home
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.showcaseSide}>
        <FeatureCarousel />
      </div>
    </div>
  );
}
