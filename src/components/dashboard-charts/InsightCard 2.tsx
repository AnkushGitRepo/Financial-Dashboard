'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './InsightCard.module.css';

interface InsightData {
  content: string;
  generatedAt: string;
}

interface InsightCardProps {
  label: string;
  endpoint: string;
  /** POST body, e.g. { symbol } or { slug } or {}. */
  body: Record<string, unknown>;
  initial: InsightData | null;
  /** Whether an AI key is resolvable for this surface (server-checked). */
  hasKey: boolean;
}

function relative(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function InsightCard({ label, endpoint, body, initial, hasKey }: InsightCardProps) {
  const [data, setData] = useState<InsightData | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (force: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, force }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setError(payload?.error === 'no_ai_key' ? 'no_ai_key' : (payload?.error ?? 'Could not generate.'));
        return;
      }
      setData({ content: payload.data.content, generatedAt: payload.data.generatedAt });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {data && !loading && (
          <button type="button" className={styles.refresh} onClick={() => run(true)}>
            Refresh
          </button>
        )}
      </div>

      {!hasKey ? (
        <p className={styles.empty}>
          <Link href="/dashboard/settings" className={styles.link}>
            Add your AI provider key
          </Link>{' '}
          to generate insights. Nothing is charged by MarketMitra.
        </p>
      ) : loading ? (
        <p className={styles.empty}>Generating…</p>
      ) : error === 'no_ai_key' ? (
        <p className={styles.empty}>
          <Link href="/dashboard/settings" className={styles.link}>
            Add your AI provider key
          </Link>{' '}
          in Settings to generate this.
        </p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : data ? (
        <>
          <p className={styles.body}>{data.content}</p>
          <p className={styles.meta}>AI-generated · {relative(data.generatedAt)}</p>
        </>
      ) : (
        <button type="button" className={styles.generate} onClick={() => run(false)}>
          Generate {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}
