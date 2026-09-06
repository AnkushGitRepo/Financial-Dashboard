'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Ipo } from '@/lib/dashboard/iposApi';
import type { IpoWatchParams } from '@/lib/alerts/types';
import { IpoRow } from './IpoRow';
import styles from './page.module.css';

interface IposPageClientProps {
  ipos: Ipo[];
  initialWatch: IpoWatchParams | null;
  aiKeyAvailable: boolean;
}

const DEFAULT_WATCH: IpoWatchParams = {
  triggers: { opens: true, lastDay: true, allotmentListing: false },
  ipoType: 'all',
};

export function IposPageClient({ ipos, initialWatch, aiKeyAvailable }: IposPageClientProps) {
  const router = useRouter();
  const [watchOpen, setWatchOpen] = useState(false);
  const [watch, setWatch] = useState<IpoWatchParams>(initialWatch ?? DEFAULT_WATCH);
  const [saving, setSaving] = useState(false);
  const watchOn = initialWatch !== null;

  const openNow = ipos.filter((i) => i.status === 'open');
  const upcoming = ipos.filter((i) => i.status === 'upcoming');
  const recent = ipos.filter((i) => i.status === 'listed' || i.status === 'closed');

  const saveWatch = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ipo_watch', params: watch }),
      });
      if (res.ok) {
        setWatchOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const setTrigger = (key: keyof IpoWatchParams['triggers'], value: boolean) =>
    setWatch((w) => ({ ...w, triggers: { ...w.triggers, [key]: value } }));

  return (
    <>
      <div className={styles.watchBar}>
        <button
          type="button"
          className={`${styles.watchToggle} ${watchOn ? styles.watchToggleOn : ''}`}
          onClick={() => setWatchOpen((v) => !v)}
        >
          {watchOn ? '🔔 IPO alerts on' : 'Notify me about IPOs'}
        </button>
      </div>

      {watchOpen && (
        <div className={styles.watchPanel}>
          <p className={styles.watchPanelTitle}>Notify me when an IPO…</p>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={watch.triggers.opens}
              onChange={(e) => setTrigger('opens', e.target.checked)}
            />
            opens for subscription
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={watch.triggers.lastDay}
              onChange={(e) => setTrigger('lastDay', e.target.checked)}
            />
            is on its last day to apply
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={watch.triggers.allotmentListing}
              onChange={(e) => setTrigger('allotmentListing', e.target.checked)}
            />
            reaches allotment / listing day
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={watch.ipoType === 'mainboard'}
              onChange={(e) => setWatch((w) => ({ ...w, ipoType: e.target.checked ? 'mainboard' : 'all' }))}
            />
            mainboard IPOs only
          </label>
          <div className={styles.watchActions}>
            <button type="button" className={styles.btnSmall} onClick={saveWatch} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {ipos.length === 0 ? (
        <div className={styles.emptyCard}>
          <p className={styles.emptyTitle}>No IPO data right now</p>
          <p className={styles.emptyText}>
            The tracker refreshes periodically — check back shortly.
          </p>
        </div>
      ) : (
        <>
          <Section title="Open now" ipos={openNow} aiKeyAvailable={aiKeyAvailable} />
          <Section title="Upcoming" ipos={upcoming} aiKeyAvailable={aiKeyAvailable} />
          <Section title="Recently closed / listed" ipos={recent} aiKeyAvailable={aiKeyAvailable} />
        </>
      )}
    </>
  );
}

function Section({
  title,
  ipos,
  aiKeyAvailable,
}: {
  title: string;
  ipos: Ipo[];
  aiKeyAvailable: boolean;
}) {
  if (ipos.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title} <span className={styles.sectionCount}>{ipos.length}</span>
      </h2>
      <ul className={styles.ipoList}>
        {ipos.map((ipo) => (
          <IpoRow key={ipo.slug} ipo={ipo} aiKeyAvailable={aiKeyAvailable} />
        ))}
      </ul>
    </section>
  );
}
