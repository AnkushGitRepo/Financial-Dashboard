// Shared Clerk <SignIn>/<SignUp> theming — keeps the widget on-brand with
// /docs/design-system.md instead of Clerk's default purple theme.
export const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--color-surface-dark)',
    colorBackground: 'var(--color-surface)',
    colorText: 'var(--color-text)',
    colorTextSecondary: 'var(--color-text-muted)',
    colorInputBackground: 'var(--color-surface)',
    colorInputText: 'var(--color-text)',
    colorDanger: 'var(--color-danger)',
    colorSuccess: 'var(--color-mint-strong)',
    borderRadius: '12px',
    fontFamily: 'var(--font-sans)',
  },
  elements: {
    rootBox: {
      width: '100%',
    },
    cardBox: {
      width: '100%',
      boxShadow: 'none',
    },
    card: {
      boxShadow: 'none',
      border: 'none',
      backgroundColor: 'transparent',
      padding: 0,
      width: '100%',
    },
    header: { display: 'none' },
    footer: { display: 'none' },
    formButtonPrimary: {
      textTransform: 'none',
      fontWeight: 700,
      // Clerk's shared borderRadius variable was applying unevenly across
      // corners on pill buttons (left corners full-round, right corners
      // squared off) — force all four corners explicitly instead.
      borderRadius: 'var(--radius-pill)',
    },
    socialButtonsBlockButton: {
      borderColor: 'var(--border-hairline-strong)',
      borderRadius: 'var(--radius-pill)',
    },
    formFieldInput: {
      borderColor: 'var(--border-hairline-strong)',
      borderRadius: 'var(--radius-sm)',
    },
  },
} as const;
