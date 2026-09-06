import { isHosted } from '@/lib/deployment-mode';

// Self-host mode is "no login, single local user" (ADR 0010) — every
// self-hosted deployment's data belongs to this one fixed id. Hosted mode
// uses the real Clerk user id. Route handlers must always call this rather
// than reading Clerk directly, so the selfhost placeholder stays
// centralized in one place per ADR 0010's own guidance.
export async function getCurrentUserId(): Promise<string | null> {
  if (!isHosted()) {
    return 'local';
  }
  const { auth } = await import('@clerk/nextjs/server');
  const { userId } = await auth();
  return userId;
}
