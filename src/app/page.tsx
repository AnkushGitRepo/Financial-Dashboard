import Link from "next/link";
import { Show } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.wrapper}>
      <h1>MarketMitra</h1>
      <p>v2 scaffold — full landing page content lands in Phase 3.</p>
      <nav className={styles.nav}>
        <Show when="signed-out">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Sign up</Link>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard">Go to dashboard</Link>
        </Show>
      </nav>
    </main>
  );
}
