'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import styles from './FeatureCarousel.module.css';

const BAR_HEIGHTS = [30, 45, 38, 60, 50, 72, 64, 80];

function PortfolioVisual() {
  return (
    <div className={styles.statGrid}>
      <div className={styles.statRow}>
        <div>
          <div className={styles.statRowLabel}>Equity</div>
          <div className={styles.statRowValue}>₹8,10,400</div>
        </div>
        <div className={styles.statRowDelta}>▲ 2.4%</div>
      </div>
      <div className={styles.statRow}>
        <div>
          <div className={styles.statRowLabel}>Mutual funds</div>
          <div className={styles.statRowValue}>₹3,26,120</div>
        </div>
        <div className={styles.statRowDelta}>▲ 0.8%</div>
      </div>
      <div className={styles.statRow}>
        <div>
          <div className={styles.statRowLabel}>Cash</div>
          <div className={styles.statRowValue}>₹1,11,800</div>
        </div>
        <div className={styles.statRowDelta}>— idle</div>
      </div>
    </div>
  );
}

function PricesVisual() {
  return (
    <div className={styles.priceCard}>
      <div className={styles.priceHead}>
        <span className={styles.priceValue}>₹12,48,320</span>
        <span className={styles.priceDelta}>▲ 1.9%</span>
      </div>
      <div className={styles.chartStrip}>
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height: `${h}%`,
              background: i % 3 === 1 ? 'var(--color-danger-soft)' : 'var(--color-mint-strong)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InsightsVisual() {
  return (
    <div className={styles.insightCard}>
      <div className={styles.insightLabel}>Today&apos;s read</div>
      <div className={styles.insightBody}>
        Banking holdings carried most of your gain. Your cash sat idle for the fourth week.
      </div>
    </div>
  );
}

function ToolsVisual() {
  return (
    <div className={styles.chipWrap}>
      <span className={styles.chip}>Claude</span>
      <span className={styles.chip}>n8n</span>
      <span className={styles.chip}>cron + scripts</span>
      <span className={styles.chip}>REST API</span>
    </div>
  );
}

const SLIDES = [
  {
    title: 'One portfolio view',
    body: 'Stocks, funds and cash from every account, added up in a single number you can trust.',
    Visual: PortfolioVisual,
  },
  {
    title: 'Real-time prices',
    body: 'Live quotes and alerts, so you find out when something moves instead of the next morning.',
    Visual: PricesVisual,
  },
  {
    title: 'Insights that explain',
    body: 'See what drove your day, where you are concentrated, and what has quietly drifted.',
    Visual: InsightsVisual,
  },
  {
    title: 'Connects to your own tools',
    body: 'An open API lets you pipe your portfolio into Claude, n8n or your own scripts.',
    Visual: ToolsVisual,
  },
];

const AUTO_ADVANCE_MS = 5000;

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const active = SLIDES[index];
  const Visual = active.Visual;

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={styles.stage}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1] }}
          >
            <div className={styles.visualCard}>
              <Visual />
            </div>
            <div className={styles.caption}>
              <h2 className={styles.title}>{active.title}</h2>
              <p className={styles.body}>{active.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className={styles.dots}>
          {SLIDES.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Show slide: ${slide.title}`}
              className={`${styles.dot} ${i === index ? styles.active : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
