import React from 'react';

interface PaokLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'black' | 'white' | 'inverted';
}

export const PaokLogo: React.FC<PaokLogoProps> = ({
  className = '',
  size = 40,
  variant = 'black',
}) => {
  const isWhite = variant === 'white';
  const bgColor = isWhite ? '#FFFFFF' : '#000000';
  const fgColor = isWhite ? '#000000' : '#FFFFFF';
  const borderColor = isWhite ? '#000000' : '#FFFFFF';

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label="PAOK Coffee Shop Crest"
    >
      <svg
        viewBox="0 0 100 120"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform duration-200"
      >
        {/* Outer Shield Outline */}
        <path
          d="M 50 115 C 24 96 10 70 8 42 C 6 22 20 8 50 5 C 80 8 94 22 92 42 C 90 70 76 96 50 115 Z"
          fill={bgColor}
          stroke={borderColor}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner boundary rim */}
        <path
          d="M 50 110 C 26 92 14 68 12 43 C 10 25 22 12 50 9 C 78 12 90 25 88 43 C 86 68 74 92 50 110 Z"
          fill={bgColor}
        />

        {/* "PAOK" Lettering */}
        <text
          x="50"
          y="31"
          fill={fgColor}
          fontFamily="system-ui, -apple-system, 'Inter', sans-serif"
          fontWeight="900"
          fontSize="15"
          letterSpacing="2.2px"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          PAOK
        </text>

        {/* Four Iconic Vertical Stripes */}
        <g fill={fgColor}>
          {/* Stripe 1 */}
          <rect x="23" y="38" width="8" height="23" rx="1.5" />
          {/* Stripe 2 */}
          <rect x="36" y="38" width="8" height="23" rx="1.5" />
          {/* Stripe 3 */}
          <rect x="56" y="38" width="8" height="23" rx="1.5" />
          {/* Stripe 4 */}
          <rect x="69" y="38" width="8" height="23" rx="1.5" />
        </g>

        {/* Double-Headed Eagle Silhouette */}
        <g fill={fgColor}>
          {/* Central Body & Tail feathers */}
          <ellipse cx="50" cy="79" rx="7" ry="11" />
          {/* Tail fan */}
          <path d="M 45 88 L 50 100 L 55 88 L 53 87 L 47 87 Z" />
          <path d="M 42 90 L 46 99 L 48 94 Z" />
          <path d="M 58 90 L 54 99 L 52 94 Z" />

          {/* Left Wing (spreads downward and outward) */}
          <path
            d="M 45 74 C 36 65 24 67 18 73 C 24 77 34 78 43 83 C 33 86 23 83 17 87 C 24 90 34 89 44 87 Z"
          />
          <path
            d="M 28 66 C 22 69 17 76 15 81 C 21 82 29 80 37 77 Z"
          />

          {/* Right Wing (mirrored) */}
          <path
            d="M 55 74 C 64 65 76 67 82 73 C 76 77 66 78 57 83 C 67 86 77 83 83 87 C 76 90 66 89 56 87 Z"
          />
          <path
            d="M 72 66 C 78 69 83 76 85 81 C 79 82 71 80 63 77 Z"
          />

          {/* Left Head */}
          <path d="M 46 72 C 43 70 41 66 43 63 C 45 61 48 62 48 66 Z" />
          {/* Left Beak */}
          <polygon points="41,64 38,65 41,67" />

          {/* Right Head */}
          <path d="M 54 72 C 57 70 59 66 57 63 C 55 61 52 62 52 66 Z" />
          {/* Right Beak */}
          <polygon points="59,64 62,65 59,67" />
        </g>
      </svg>
    </div>
  );
};
