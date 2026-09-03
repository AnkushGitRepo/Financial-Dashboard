import styles from './Logo.module.css';

interface LogoProps {
  size?: number;
  animated?: boolean;
  onDark?: boolean;
  showWordmark?: boolean;
}

export function Logo({
  size = 28,
  animated = false,
  onDark = false,
  showWordmark = true,
}: LogoProps) {
  const markFill = onDark ? '#ffffff' : '#15171c';
  const accentFill = onDark ? '#15171c' : '#7ee2a8';

  return (
    <span className={styles.wrapper}>
      <svg
        className={animated ? styles.animated : undefined}
        width={size}
        height={size}
        viewBox="0 0 28 28"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <rect x="0" y="0" width="28" height="28" rx="9" fill={markFill}></rect>
        <path
          className={styles.line}
          d="M7 18.6 L12 13.2 L15.6 15.8 L21 9.4"
          fill="none"
          stroke={accentFill}
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <circle className={styles.dot} cx="21" cy="9.4" r="2.7" fill={accentFill}></circle>
      </svg>
      {showWordmark && (
        <span className={onDark ? `${styles.wordmark} ${styles.onDark}` : styles.wordmark}>
          MarketMitra
        </span>
      )}
    </span>
  );
}
