'use client';

import { useMemo, useState } from 'react';
import styles from './DashboardPreview.module.css';

const TABS = ['Dashboard', 'Portfolio', 'Markets', 'Insights'];
const RANGES = ['1W', '1M', '6M', '1Y'];

const CANDLE_SEQUENCE = [
  42, 38, 55, 47, 61, 52, 44, 58, 66, 49, 57, 71, 63, 55, 68, 76, 64, 72, 81, 69, 77, 86, 74, 83,
  91, 79, 88, 96, 84, 92,
];

interface Candle {
  up: boolean;
  bodyHeight: number;
  bodyBottom: number;
  wickHeight: number;
  wickBottom: number;
}

function buildCandles(): Candle[] {
  return CANDLE_SEQUENCE.map((v, i) => {
    const prev = i === 0 ? CANDLE_SEQUENCE[0] - 4 : CANDLE_SEQUENCE[i - 1];
    const up = v >= prev;
    const bodyHeight = Math.max(10, Math.abs(v - prev) * 2.2 + 12);
    const bodyBottom = Math.min(v, prev) * 1.35;
    return {
      up,
      bodyHeight,
      bodyBottom,
      wickHeight: bodyHeight + 14,
      wickBottom: bodyBottom - 6,
    };
  });
}

const ACTIVITY = [
  {
    icon: 'HD',
    iconBg: 'var(--color-mint-bg)',
    iconColor: 'var(--color-mint-text)',
    label: 'HDFC Bank hit your alert',
    time: '2 hours ago',
    amount: '₹1,712',
    meta: '+1.2%',
    positive: true,
  },
  {
    icon: 'SIP',
    iconBg: 'var(--color-amber-bg-soft)',
    iconColor: 'var(--color-amber-text-soft)',
    label: 'Monthly SIP invested',
    time: 'Yesterday · 9:04 AM',
    amount: '₹15,000',
    meta: 'auto',
    positive: false,
  },
  {
    icon: 'DIV',
    iconBg: 'var(--color-violet-bg)',
    iconColor: 'var(--color-violet-text)',
    label: 'Dividend credited',
    time: '2 days ago',
    amount: '₹2,340',
    meta: 'credit',
    positive: true,
  },
  {
    icon: 'API',
    iconBg: 'var(--color-bg-alt)',
    iconColor: 'var(--color-text-secondary)',
    label: 'Weekly summary sent by your agent',
    time: 'Sunday · via API',
    amount: null,
    meta: 'optional',
    positive: false,
  },
];

export function DashboardPreview() {
  const [tab, setTab] = useState(0);
  const [range, setRange] = useState(1);
  const candles = useMemo(() => buildCandles(), []);

  return (
    <section id="dashboard" className={styles.section}>
      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.brand}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 28 28"
              aria-hidden="true"
              style={{ display: 'block' }}
            >
              <rect x="0" y="0" width="28" height="28" rx="9" fill="#15171c"></rect>
              <path
                d="M7 18.6 L12 13.2 L15.6 15.8 L21 9.4"
                fill="none"
                stroke="#7ee2a8"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <circle cx="21" cy="9.4" r="2.7" fill="#7ee2a8"></circle>
            </svg>
            <span>MarketMitra</span>
          </div>
          <div className={styles.tabPills}>
            {TABS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`${styles.pill} ${tab === i ? styles.active : ''}`}
                onClick={() => setTab(i)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.userChip}>
            <div className={styles.bell}>
              <div className={styles.bellIcon} />
              <div className={styles.bellDot} />
            </div>
            <div className={styles.avatarRow}>
              <div className={styles.avatar}>AR</div>
              <div className={styles.userMeta}>
                <div className={styles.userName}>Aarti R.</div>
                <div className={styles.userHandle}>@aarti</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.label}>Portfolio value</div>
                <div className={styles.valueRow}>
                  <div className={styles.value}>₹12,48,320</div>
                  <div className={styles.delta}>▲ 1.9%</div>
                </div>
                <div className={styles.subline}>
                  + ₹23,410 today · 14 holdings across 3 accounts
                </div>
              </div>
              <div className={styles.rangePills}>
                {RANGES.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.smallPill} ${range === i ? styles.active : ''}`}
                    onClick={() => setRange(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.chartWrap}>
              <div className={styles.gridLines}>
                <div className={styles.gridLine} />
                <div className={styles.gridLine} />
                <div className={styles.gridLine} />
                <div className={styles.gridLine} />
              </div>
              {candles.map((c, i) => (
                <div className={styles.col} key={i}>
                  <div
                    className={styles.wick}
                    style={{
                      bottom: `${c.wickBottom}px`,
                      height: `${c.wickHeight}px`,
                      background: c.up ? '#34c17c' : '#f0836b',
                    }}
                  />
                  <div
                    className={styles.body}
                    style={{
                      bottom: `${c.bodyBottom}px`,
                      height: `${c.bodyHeight}px`,
                      background: c.up ? '#34c17c' : '#f0836b',
                    }}
                  />
                </div>
              ))}
              <div className={styles.chartBadge}>
                <span className={styles.chartBadgeDot} />
                Best day · +1.7%
              </div>
            </div>

            <div className={styles.statRow}>
              <div className={styles.statCard}>
                <div className={styles.label}>Equity</div>
                <div className={styles.statValue}>₹8,10,400</div>
                <div className={styles.statDelta}>▲ 2.4%</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.label}>Mutual funds</div>
                <div className={styles.statValue}>₹3,26,120</div>
                <div className={styles.statDelta}>▲ 0.8%</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.label}>Cash</div>
                <div className={styles.statValue}>₹1,11,800</div>
                <div className={`${styles.statDelta} ${styles.flat}`}>— idle</div>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.activityHead}>
              <div className={styles.activityTitleRow}>
                <span className={styles.activityTitle}>Activity</span>
                <span className={styles.badgeCount}>{ACTIVITY.length}</span>
              </div>
              <div className={styles.chevron}>⌄</div>
            </div>

            <div className={styles.activityList}>
              {ACTIVITY.map((item) => (
                <div className={styles.activityItem} key={item.label}>
                  <div
                    className={styles.activityIcon}
                    style={{ background: item.iconBg, color: item.iconColor }}
                  >
                    {item.icon}
                  </div>
                  <div className={styles.activityBody}>
                    <div className={styles.activityLabel}>{item.label}</div>
                    <div className={styles.activityTime}>{item.time}</div>
                  </div>
                  <div className={styles.activityAmountWrap}>
                    {item.amount && <div className={styles.activityAmount}>{item.amount}</div>}
                    <div
                      className={`${styles.activityMeta} ${item.positive ? styles.positive : ''}`}
                    >
                      {item.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.todaysRead}>
              <div className={styles.todaysReadLabel}>Today&apos;s read</div>
              <div className={styles.todaysReadBody}>
                Banking holdings carried most of your gain. Your cash sat idle for the fourth week.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
