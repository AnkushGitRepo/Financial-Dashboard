import { IndexCard } from '@/components/dashboard-charts/IndexCard';
import { MoverPanel } from '@/components/dashboard-charts/MoverPanel';
import { getIndices } from '@/lib/dashboard/fundamentalsApi';
import { getTopMovers } from '@/lib/dashboard/quotes';
import { MarketsSearchBar } from './MarketsSearchBar';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const [indices, movers] = await Promise.all([getIndices(), getTopMovers()]);

  return (
    <div className={styles.pageRoot}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>Live market data</p>
        <h1 className={styles.h1}>Markets</h1>
        <MarketsSearchBar />
      </div>

      <div className={styles.indexGrid}>
        {(indices ?? []).map((ix) => (
          <IndexCard key={ix.name} index={ix} />
        ))}
        {(!indices || indices.length === 0) && (
          <p className={styles.eyebrow}>Index data is temporarily unavailable — the fundamentals service may be offline.</p>
        )}
      </div>

      <div className={styles.moverGrid}>
        <MoverPanel title="Top gainers (watchlist)" rows={movers.gainers} />
        <MoverPanel title="Top losers (watchlist)" rows={movers.losers} />
      </div>
    </div>
  );
}
