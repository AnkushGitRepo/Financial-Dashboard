import { ImageResponse } from 'next/og';

// Generated from the same mark as src/components/landing/Logo.tsx, so the
// browser tab icon and the in-app wordmark logo never drift apart.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#15171c',
          borderRadius: 9,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 28 28">
          <path
            d="M7 18.6 L12 13.2 L15.6 15.8 L21 9.4"
            fill="none"
            stroke="#7ee2a8"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="9.4" r="3" fill="#7ee2a8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
