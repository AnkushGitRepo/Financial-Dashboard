'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import styles from './FAQAccordion.module.css';

const FAQS = [
  {
    q: 'What happens after my 7-day trial ends?',
    a: 'Nothing disappears. You can move to the hosted plan to carry on as you were, or switch to the free self-hosted version and keep the same dashboard with your own API keys.',
  },
  {
    q: 'Can I use my own API keys?',
    a: 'Yes, that is how the self-hosted version works: you add a market data key and an AI provider key, and there are no usage limits on top. On the hosted plan we supply the keys for you.',
  },
  {
    q: 'Is the self-hosted version really free?',
    a: 'Yes. It is MIT licensed and includes every feature, with no caps. The only costs are whatever your own data and AI providers charge you.',
  },
  {
    q: 'What AI providers can I use?',
    a: 'When you self-host you can point the AI features at Gemini, Anthropic or OpenRouter, whichever you already have a key for.',
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
