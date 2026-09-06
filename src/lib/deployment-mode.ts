// Single source of truth for the hosted-vs-selfhost gate (ADR 0010).
// Uses a NEXT_PUBLIC_ var so the same check works in server code (middleware,
// layout, route handlers) and client components without prop-drilling.
export function isHosted(): boolean {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'hosted';
}
