import Link from 'next/link';
import { Reveal, RevealGroup, RevealItem } from './Reveal';
import styles from './PricingCards.module.css';

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.34c-2.23.49-2.7-1.07-2.7-1.07-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.83-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.52.56.83 1.28.83 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

// Two ways to run it, both free (ADR 0016, which reconciles the landing
// page with ADR 0011's "no paid tier, full stop"). ADR 0008's paid-hosted
// model is superseded.
const HOSTED_FEATURES = [
  'Full dashboard, real-time prices and alerts',
  'We run the servers and the market-data access',
  'Nothing to install, no keys or updates to manage',
  'Bring your own AI key for insights — Gemini, Anthropic or OpenRouter',
  'Fair-use rate limits on the shared instance',
];

const SELF_HOSTED_FEATURES = [
  'Every feature, no rate limits',
  'Bring your own market-data and AI provider keys',
  'Choose your AI provider: Gemini, Anthropic or OpenRouter',
  'Open API for your own automations and agents',
];

export function PricingCards() {
  return (
    <section id="pricing" className={styles.section}>
      <Reveal className={styles.heading}>
        <div className={styles.eyebrow}>Hosted or self-hosted</div>
        <h2 className={styles.title}>Two ways to run it</h2>
        <p className={styles.intro}>
          Let us host it and keep everything ready to go, or run the same dashboard yourself with
          your own keys. Both are free — there is no paid plan.
        </p>
      </Reveal>

      <RevealGroup className={styles.grid} stagger={0.12}>
        <RevealItem className={`${styles.card} ${styles.hosted}`}>
          <div className={styles.cardHead}>
            <span className={styles.tierName}>Hosted</span>
            <span className={`${styles.tag} ${styles.tagHosted}`}>For investors</span>
          </div>
          <p className={styles.tierBody}>
            We run the servers and cover the market-data access, so there is nothing to set up.
          </p>

          <div className={styles.priceRow}>
            <span className={styles.price}>Free</span>
            <span className={styles.pricePeriod}>we host it</span>
          </div>
          <div className={`${styles.badgeRow} ${styles.badgeHosted}`}>No paid plan · no trial</div>

          <div className={styles.featureList}>
            {HOSTED_FEATURES.map((feature) => (
              <div className={styles.featureItem} key={feature}>
                <span className={styles.checkDark}>✓</span>
                <span className={styles.featureText}>{feature}</span>
              </div>
            ))}
          </div>

          <div className={styles.spacer} />
          <Link href="/sign-up" className={`${styles.ctaButton} ${styles.ctaHosted}`}>
            Sign up
          </Link>
          <div className={styles.ctaNote}>Just an account — no card, nothing to pay.</div>
        </RevealItem>

        <RevealItem className={`${styles.card} ${styles.selfHosted}`}>
          <div className={styles.cardHead}>
            <span className={styles.tierName}>Self-hosted</span>
            <span className={`${styles.tag} ${styles.tagSelf}`}>For builders</span>
          </div>
          <p className={styles.tierBody}>
            Run the same dashboard on your own machine with your own API keys. Nothing is held back.
          </p>

          <div className={styles.priceRow}>
            <span className={styles.price}>Free</span>
            <span className={styles.pricePeriod}>forever</span>
          </div>
          <div className={`${styles.badgeRow} ${styles.badgeSelf}`}>MIT licensed · no limits</div>

          <div className={styles.featureList}>
            {SELF_HOSTED_FEATURES.map((feature) => (
              <div className={styles.featureItem} key={feature}>
                <span className={styles.checkMint}>✓</span>
                <span className={styles.featureText}>{feature}</span>
              </div>
            ))}
          </div>

          <div className={styles.wireBox}>
            <div className={styles.wireLabel}>Wire it up</div>
            <div className={styles.chipRow}>
              <span className={styles.chip}>Claude</span>
              <span className={styles.chip}>n8n</span>
              <span className={styles.chip}>cron + scripts</span>
              <span className={styles.chip}>REST API</span>
            </div>
          </div>

          <div className={styles.spacer} />
          <a href="#opensource" className={`${styles.ctaButton} ${styles.ctaSelf}`}>
            <GitHubIcon />
            View on GitHub
          </a>
          <div className={styles.ctaNote}>Clone the repo and run it in an afternoon.</div>
        </RevealItem>
      </RevealGroup>
    </section>
  );
}
