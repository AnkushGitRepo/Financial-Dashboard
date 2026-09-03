import { SignUp } from '@clerk/nextjs';
import styles from './page.module.css';

export default function SignUpPage() {
  return (
    <main className={styles.wrapper}>
      <SignUp />
    </main>
  );
}
