import { Reveal, RevealGroup, RevealItem } from './Reveal';
import styles from './FeaturesGrid.module.css';

const FEATURES = [
  {
    title: 'One portfolio view',
    body: 'Stocks, funds and cash from every account, added up in a single number you can trust.',
    iconBg: 'var(--color-mint-bg)',
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0f6b3f"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="3.5" width="17" height="9.5" rx="2.5"></rect>
        <path d="M6 16.5h12"></path>
        <path d="M8 20h8"></path>
      </svg>
    ),
  },
  {
    title: 'Real-time prices',
    body: 'Live quotes and alerts, so you find out when something moves instead of the next morning.',
    iconBg: 'var(--color-amber-bg-soft)',
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7a5200"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 12.5h4l2-5 3 9.5 2.5-6 1.8 3.5h5.7"></path>
      </svg>
    ),
  },
  {
    title: 'Insights that explain',
    body: 'See what drove your day, where you are concentrated, and what has quietly drifted.',
    iconBg: 'var(--color-violet-bg)',
    icon: (
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#40389c"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 15.5l4.5-5 3 2.6L16 6.5"></path>
        <circle cx="15" cy="15" r="4.6"></circle>
        <path d="M18.4 18.4L21.5 21.5"></path>
      </svg>
    ),
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className={styles.section}>
      <Reveal className={styles.heading}>
        <div className={styles.eyebrow}>What you get</div>
        <h2 className={styles.title}>Everything in one place, explained in plain words</h2>
      </Reveal>
      <RevealGroup className={styles.grid}>
        {FEATURES.map((feature) => (
          <RevealItem className={styles.card} key={feature.title}>
            <div className={styles.iconWrap} style={{ background: feature.iconBg }}>
              {feature.icon}
            </div>
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardBody}>{feature.body}</p>
          </RevealItem>
        ))}
        <RevealItem className={`${styles.card} ${styles.dark}`}>
          <div className={styles.iconWrap} style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7ee2a8"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="5" cy="6" r="2.6"></circle>
              <circle cx="5" cy="18" r="2.6"></circle>
              <circle cx="18.5" cy="12" r="2.9"></circle>
              <path d="M7.4 7.2l8.4 3.6M7.4 16.8l8.4-3.6"></path>
            </svg>
          </div>
          <h3 className={styles.cardTitle}>Connects to your own tools</h3>
          <p className={styles.cardBody}>
            If you like tinkering, an open API lets you pipe your portfolio into Claude, n8n or your
            own scripts. Entirely optional.
          </p>
        </RevealItem>
      </RevealGroup>
    </section>
  );
}
