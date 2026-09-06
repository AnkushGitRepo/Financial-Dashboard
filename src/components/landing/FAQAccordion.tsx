'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import styles from './FAQAccordion.module.css';

const FAQS = [
  {
    q: 'Is there a paid version?',
    a: 'No. MarketMitra is free and open source (MIT licensed). Both ways of running it — hosted by us or self-hosted — are free. There is no paid plan, no trial, and no card to enter.',
  },
  {
    q: 'What is the difference between hosted and self-hosted?',
    a: 'Same product. On the hosted version we run the servers and cover the market-data access, so there is nothing to set up — it just has fair-use rate limits so one person cannot exhaust the shared instance. Self-hosted runs on your own machine with your own keys and no rate limits.',
  },
  {
    q: 'Do I need my own API keys?',
    a: 'For AI insights, yes — you add your own AI provider key (Gemini, Anthropic or OpenRouter) whether you use the hosted or self-hosted version. Self-hosting also needs your own market-data key; the hosted version supplies that for you.',
  },
  {
    q: 'Is the self-hosted version really the full thing?',
    a: 'Yes. Every feature, no rate limits, MIT licensed. The only costs are whatever your own data and AI providers charge you.',
  },
  {
    q: 'Where does my data live?',
    a: 'On the hosted version it stays in your own account. If you would rather keep everything on your own machine, run the self-hosted version instead. The code is public either way.',
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className={styles.section}>
      <div className={styles.headWrap}>
        <Reveal>
          <div className={styles.eyebrow}>FAQ</div>
          <h2 className={styles.title}>Questions people ask</h2>
        </Reveal>
        <div className={styles.grid}>
          {FAQS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div className={styles.item} key={item.q}>
                <button
                  type="button"
                  className={styles.question}
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : i)}
                >
                  {item.q}
                  <span className={`${styles.icon} ${open ? styles.open : ''}`}>+</span>
                </button>
                <div className={`${styles.answerRow} ${open ? styles.open : ''}`}>
                  <div className={styles.answerInner}>
                    <p className={styles.answerText}>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
