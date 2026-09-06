'use client';

import { UserButton } from '@clerk/nextjs';
import styles from './AppHeader.module.css';

// Split out so its Clerk hook/component is only ever mounted in hosted mode
// — see src/components/dashboard/HostedUserFooter.tsx for the same pattern
// (ADR 0010): rendering Clerk components with no ClerkProvider in the tree
// throws. `showName` lets Clerk's own avatar+name trigger stand in for the
// design's user pill, so account-menu access comes for free.
export function HostedUserBadge() {
  return (
    <div className={styles.userBadge}>
      <UserButton
        showName
        appearance={{
          elements: {
            userButtonBox: { flexDirection: 'row-reverse', gap: '9px' },
            userButtonOuterIdentifier: {
              fontSize: '13.5px',
              fontWeight: 500,
              color: 'var(--app-ink)',
              fontFamily: 'var(--font-sans)',
            },
            avatarBox: { width: '30px', height: '30px' },
          },
        }}
      />
    </div>
  );
}
