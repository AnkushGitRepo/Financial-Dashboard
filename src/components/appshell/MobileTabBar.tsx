'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './MobileTabBar.module.css';

const ICON_PROPS = { width: 21, height: 21, viewBox: '0 0 22 22', fill: 'none' } as const;

function DashboardIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="2.5" y="2.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12.5" y="2.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="2.5" y="12.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <rect x="12.5" y="12.5" width="7" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 3 A8 8 0 0 1 19 11 L11 11 Z" fill="currentColor" />
    </svg>
  );
}

function MarketsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="12" width="4" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="9" y="8" width="4" height="11" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
      <rect x="15" y="4" width="4" height="15" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function AlertsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path
        d="M11 3a5 5 0 0 0-5 5v3l-1.4 2.7a1 1 0 0 0 .9 1.5h11a1 1 0 0 0 .9-1.5L16 11V8a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 17.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <line x1="6.5" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="6.5" y1="11" x2="15.5" y2="11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="6.5" y1="14" x2="15.5" y2="14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isDash = pathname === '/dashboard';
  const isPort = pathname.startsWith('/dashboard/portfolio');
  const isMarkets = pathname.startsWith('/dashboard/markets') || pathname.startsWith('/dashboard/stock');
  const isAlerts = pathname.startsWith('/dashboard/alerts');
  const isNews = pathname.startsWith('/dashboard/news');

  const tabClass = (active: boolean) => `${styles.tabItem} ${active ? styles.tabItemActive : ''}`;

  return (
    <nav className={styles.tabBar} aria-label="Dashboard navigation">
      <button className={tabClass(isDash)} onClick={() => router.push('/dashboard')} type="button">
        <DashboardIcon />
        <span className={styles.tabLabel}>Dashboard</span>
      </button>
      <button className={tabClass(isPort)} onClick={() => router.push('/dashboard/portfolio')} type="button">
        <PortfolioIcon />
        <span className={styles.tabLabel}>Portfolio</span>
      </button>
      <button className={tabClass(isMarkets)} onClick={() => router.push('/dashboard/markets')} type="button">
        <MarketsIcon />
        <span className={styles.tabLabel}>Markets</span>
      </button>
      <button className={tabClass(isAlerts)} onClick={() => router.push('/dashboard/alerts')} type="button">
        <AlertsIcon />
        <span className={styles.tabLabel}>Alerts</span>
      </button>
      <button className={tabClass(isNews)} onClick={() => router.push('/dashboard/news')} type="button">
        <NewsIcon />
        <span className={styles.tabLabel}>News</span>
      </button>
    </nav>
  );
}
