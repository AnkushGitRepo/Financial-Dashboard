'use client';

// Hosted-only (ADR 0023). This is a disclosure notice, not a cookie
// *consent* banner with an accept/reject toggle — there is nothing
// non-essential to opt into. Clerk's session cookie is strictly necessary
// (you can't stay signed in without it) and Vercel Web Analytics is
// cookieless by design (see ADR 0023), so there is no optional tracking
// cookie to ask permission for. Building a fake accept/decline picker here
// would promise a choice that doesn't exist.

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import styles from './CookieNotice.module.css';

const DISMISSED_KEY = 'mm-cookie-notice-dismissed';

// useSyncExternalStore (not useState+useEffect) so reading localStorage
// can't produce a hydration-mismatch flash: the server snapshot always
// says "dismissed", and React reconciles the real client value itself.
// The native `storage` event only fires in *other* tabs, so dismissing in
// this tab dispatches a synthetic one (below) to notify this subscription.
function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  return () => window.removeEventListener('storage', onStoreChange);
}
function getSnapshot() {
  return localStorage.getItem(DISMISSED_KEY) === '1';
}
function getServerSnapshot() {
  return true;
}

export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    window.dispatchEvent(new StorageEvent('storage', { key: DISMISSED_KEY }));
  };

  return (
    <div className={styles.bar} role="status">
      <p>
        This site uses an essential sign-in cookie and cookie-free, aggregated analytics — no
        tracking cookies, nothing sold. See our <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <button type="button" onClick={dismiss} className={styles.dismiss}>
        Got it
      </button>
    </div>
  );
}
