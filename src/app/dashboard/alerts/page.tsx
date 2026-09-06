import { getCurrentUserId } from '@/lib/currentUserId';
import { listAlerts } from '@/lib/alerts/store';
import { AlertsPageClient } from './AlertsPageClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; symbol?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return (
      <div className={styles.pageRoot}>
        <p className={styles.introNote}>Sign in to manage alerts.</p>
      </div>
    );
  }

  const { new: newParam, symbol } = await searchParams;
  let alerts: Awaited<ReturnType<typeof listAlerts>> = [];
  try {
    alerts = await listAlerts(userId);
  } catch {
    // Mongo unreachable — render the shell with an empty list rather than 500.
  }

  return (
    <AlertsPageClient
      alerts={alerts}
      openNew={newParam === '1' || newParam === 'true'}
      prefillSymbol={symbol?.toUpperCase()}
    />
  );
}
