'use client';

import { UserButton, useUser } from '@clerk/nextjs';
import styles from './Sidebar.module.css';

// Split out from Sidebar so its Clerk hooks are only ever mounted in hosted
// mode — calling useUser()/UserButton with no ClerkProvider in the tree
// throws, so this must not render at all in selfhost mode.
export function HostedUserFooter() {
  const { user } = useUser();

  return (
    <>
      <UserButton />
      <div className={styles.userMeta}>
        <div className={styles.userName}>
          {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? 'Account'}
        </div>
      </div>
    </>
  );
}
