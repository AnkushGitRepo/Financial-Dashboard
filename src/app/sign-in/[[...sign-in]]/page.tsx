import { SignIn } from '@clerk/nextjs';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { clerkAppearance } from '@/components/auth/clerkAppearance';
import styles from './page.module.css';

export default function SignInPage() {
  return (
    <AuthLayout switchPrompt="Don't have an account?" switchLabel="Sign up" switchHref="/sign-up">
      <div className={styles.heading}>
        <h1>Welcome back</h1>
        <p>Sign in to see your whole portfolio again.</p>
      </div>
      <SignIn appearance={clerkAppearance} />
    </AuthLayout>
  );
}
