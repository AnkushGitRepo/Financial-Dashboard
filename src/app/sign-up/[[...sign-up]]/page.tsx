import { redirect } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { clerkAppearance } from '@/components/auth/clerkAppearance';
import { isHosted } from '@/lib/deployment-mode';
import styles from './page.module.css';

export default function SignUpPage() {
  if (!isHosted()) {
    redirect('/dashboard');
  }

  return (
    <AuthLayout switchPrompt="Already have an account?" switchLabel="Sign in" switchHref="/sign-in">
      <div className={styles.heading}>
        <h1>Create your account</h1>
        <p>Free to start — see every holding in one place.</p>
      </div>
      <SignUp appearance={clerkAppearance} />
    </AuthLayout>
  );
}
