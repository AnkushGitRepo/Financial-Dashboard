import {
  getCompany,
  getFinancials,
  getPrices,
  getRatios,
  getShareholding,
  type PricePeriod,
} from '@/lib/dashboard/fundamentalsApi';
import { pivotFinancials, toRangeSeries, groupShareholding } from '@/lib/dashboard/transforms';
import { StockPageClient } from './StockPageClient';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const PRICE_PERIODS: PricePeriod[] = ['1mo', '6mo', '1y', '5y'];

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const [company, ratios, shareholding, pl, bs, cf, ...priceSets] = await Promise.all([
    getCompany(symbol),
    getRatios(symbol),
    getShareholding(symbol),
    getFinancials(symbol, 'profit_and_loss'),
    getFinancials(symbol, 'balance_sheet'),
    getFinancials(symbol, 'cash_flow'),
    ...PRICE_PERIODS.map((p) => getPrices(symbol, p)),
  ]);

  if (!company) {
    return (
      <div className={styles.pageRoot}>
        <p className={styles.meta}>
          Couldn&rsquo;t load data for &ldquo;{symbol}&rdquo; — the fundamentals service may be offline, or
          this isn&rsquo;t a symbol it recognizes.
        </p>
      </div>
    );
  }

  const priceSeries = Object.fromEntries(
    PRICE_PERIODS.map((period, i) => [period, toRangeSeries(priceSets[i] ?? [], period)])
  ) as Record<PricePeriod, ReturnType<typeof toRangeSeries>>;

  // /prices returns newest-first (see fundamentals-api's get_price_history).
  const recentCloses = (priceSets[0] ?? []).filter((p) => p.close !== null);
  const latestPrice = recentCloses[0] ?? null;
  const previousPrice = recentCloses[1] ?? null;

  return (
    <StockPageClient
      symbol={symbol}
      company={company}
      ratios={ratios ?? []}
      shareholding={groupShareholding(shareholding ?? [])}
      financials={{
        profit_and_loss: pivotFinancials(pl ?? [], 'profit_and_loss'),
        balance_sheet: pivotFinancials(bs ?? [], 'balance_sheet'),
        cash_flow: pivotFinancials(cf ?? [], 'cash_flow'),
      }}
      priceSeries={priceSeries}
      latestClose={latestPrice?.close ?? null}
      previousClose={previousPrice?.close ?? null}
    />
  );
}
