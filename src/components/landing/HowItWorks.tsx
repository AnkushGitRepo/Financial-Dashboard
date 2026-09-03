import { Reveal, RevealGroup, RevealItem } from './Reveal';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    title: 'Create your account',
    body: 'Use the hosted version, or run MarketMitra on your own machine.',
  },
  {
    title: 'Add your holdings',
    body: 'Import a statement or enter positions manually. Everything lands in one view.',
  },
  {
    title: 'Read your dashboard',
    body: "Daily movement, allocation and alerts, written so you don't need a finance degree.",
  },
  {
    title: 'Automate it, if you want',
    body: 'Hand your API key to an assistant or workflow tool and let it send you the summaries you care about.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className={styles.section}>
      <Reveal>
        <div className={styles.card}>
          <div className={styles.layout}>
            <div>
              <div className={styles.eyebrow}>How it works</div>
              <h2 className={styles.title}>Set up once, in an afternoon</h2>
              <p className={styles.intro}>
                No spreadsheets to maintain. Nothing to reconcile by hand.
              </p>
            </div>
            <RevealGroup className={styles.steps} stagger={0.1}>
              {STEPS.map((step, i) => (
                <RevealItem className={styles.step} key={step.title}>
                  <div className={styles.stepNumber}>{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepBody}>{step.body}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
