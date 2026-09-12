import { ImageResponse } from 'next/og';

// Apple applies its own corner-rounding mask to touch icons, so this ships
// as a plain filled square (no border-radius) at the size Apple expects.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#15171c',
        }}
      >
        <svg width="132" height="132" viewBox="0 0 28 28">
          <path
            d="M7 18.6 L12 13.2 L15.6 15.8 L21 9.4"
            fill="none"
            stroke="#7ee2a8"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="21" cy="9.4" r="2.7" fill="#7ee2a8" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
