import { UserButton } from '@clerk/nextjs';
import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <main className={styles.wrapper}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <UserButton />
      </header>
      <p>Protected route — reachable only when signed in. Shell layout lands in Phase 3.</p>
    </main>
  );
}
