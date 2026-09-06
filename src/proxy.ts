import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { isHosted } from '@/lib/deployment-mode';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

// Only wraps the request in Clerk's middleware when running in hosted mode —
// in selfhost mode every request passes through untouched, so /dashboard is
// open directly with no login.
const hostedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (!isHosted()) {
    return NextResponse.next();
  }
  return hostedProxy(req, event);
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)', '/__clerk/:path*'],
};
