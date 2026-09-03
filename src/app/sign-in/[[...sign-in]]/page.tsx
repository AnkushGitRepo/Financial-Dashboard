import { SignIn } from '@clerk/nextjs';
import styles from './page.module.css';

export default function SignInPage() {
  return (
    <main className={styles.wrapper}>
      <SignIn />
    </main>
  );
}
