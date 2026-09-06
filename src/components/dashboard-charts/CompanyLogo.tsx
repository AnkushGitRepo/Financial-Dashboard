'use client';

import { useState } from 'react';

// Real company logos, sourced from a community-maintained open logo
// directory keyed by NSE ticker (github.com/dharunashokkumar/indian-listed-
// company-logos). Not every listed company has a logo there, so this falls
// back to initials on load failure rather than showing a broken image.
const LOGO_URL = (symbol: string) =>
  `https://dharunashokkumar.github.io/indian-listed-company-logos/nse/NSE_${symbol}.svg`;

export function CompanyLogo({ symbol, size }: { symbol: string; size: number }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return <>{symbol.slice(0, 3)}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external SVG logo, arbitrary host, needs onError fallback
    <img
      src={LOGO_URL(symbol)}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
      onError={() => setErrored(true)}
    />
  );
}
