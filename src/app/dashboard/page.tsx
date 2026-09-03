import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>
          Your portfolio will show up here once holdings are connected.
        </p>
      </header>

      <div className={styles.emptyState}>
        <div className={styles.iconWrap}>
          <svg
            width="26"
            height="26"
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
        </div>
        <h2 className={styles.emptyTitle}>No holdings yet</h2>
        <p className={styles.emptyBody}>
          This is the dashboard shell — the layout future features will slot into. Portfolio value,
          real-time prices, and insights will appear here once those features ship.
        </p>
      </div>
    </div>
  );
}
