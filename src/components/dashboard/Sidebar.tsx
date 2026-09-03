'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { Logo } from '@/components/landing/Logo';
import styles from './Sidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3.5" y="3.5" width="17" height="9.5" rx="2.5"></rect>
        <path d="M6 16.5h12"></path>
        <path d="M8 20h8"></path>
      </svg>
    ),
  },
  {
    href: '/dashboard/portfolio',
    label: 'Portfolio',
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 15.5l4.5-5 3 2.6L16 6.5"></path>
        <circle cx="15" cy="15" r="4.6"></circle>
      </svg>
    ),
  },
  {
    href: '/dashboard/markets',
    label: 'Markets',
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2.5 12.5h4l2-5 3 9.5 2.5-6 1.8 3.5h5.7"></path>
      </svg>
    ),
  },
  {
    href: '/dashboard/insights',
    label: 'Insights',
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="5" cy="6" r="2.6"></circle>
        <circle cx="5" cy="18" r="2.6"></circle>
        <circle cx="18.5" cy="12" r="2.9"></circle>
        <path d="M7.4 7.2l8.4 3.6M7.4 16.8l8.4-3.6"></path>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoRow}>
        <Link href="/">
          <Logo size={28} />
        </Link>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          if (item.comingSoon) {
            return (
              <div key={item.href} className={`${styles.navItem} ${styles.disabled}`}>
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
                <span className={styles.comingSoon}>Soon</span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <UserButton />
        <div className={styles.userMeta}>
          <div className={styles.userName}>
            {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Account'}
          </div>
        </div>
      </div>
    </aside>
  );
}
