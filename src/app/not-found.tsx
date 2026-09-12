import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>This page doesn&apos;t exist</h1>
        <p className={styles.body}>
          The link may be broken, or the page may have moved. Let&apos;s get you back somewhere
          useful.
        </p>
        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.primary}>
            Go to Dashboard
          </Link>
          <Link href="/" className={styles.secondary}>
            Back to home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
