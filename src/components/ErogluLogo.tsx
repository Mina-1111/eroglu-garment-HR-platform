import React from 'react';

interface ErogluLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'print' | 'blue';
  textColor?: string;
}

export const ErogluLogo: React.FC<ErogluLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'blue',
  textColor
}) => {
  // Dimension scales
  const dimensions = {
    sm: { height: 26, width: variant === 'mark' ? 26 : 100 },
    md: { height: 36, width: variant === 'mark' ? 36 : 140 },
    lg: { height: 48, width: variant === 'mark' ? 48 : 185 },
    xl: { height: 60, width: variant === 'mark' ? 60 : 230 }
  }[size];

  // Text color: Blue on main page, black on print, or custom
  const resolvedTextColor = textColor || (
    variant === 'print' ? '#111827' :
    variant === 'blue' || variant === 'full' ? '#1D4ED8' : '#1D4ED8'
  );

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox={variant === 'mark' ? "0 0 75 95" : "0 0 368 95"}
        height={dimensions.height}
        className="w-auto max-h-full block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="EROĞLU Garment Logo"
      >
        {/* ============================================================ */}
        {/* ICON MARK: 3 Slanted Crimson Red Bars Forming Stylized 'E' */}
        {/* ============================================================ */}
        <g id="eroglu-symbol">
          {/* Top Bar */}
          <polygon points="10,24 68,10 68,28 10,42" fill="#D0103A" />
          {/* Middle Bar */}
          <polygon points="10,48 68,34 68,52 10,66" fill="#D0103A" />
          {/* Bottom Bar */}
          <polygon points="10,72 68,58 68,76 10,90" fill="#D0103A" />
        </g>

        {variant !== 'mark' && (
          /* ========================================================== */
          /* LOGO WORDMARK: EROĞLU in blue on main page, black in print */
          /* ========================================================== */
          <g id="eroglu-text" fill={resolvedTextColor}>
            {/* Letter E */}
            <path d="M88,24 H122 V33 H99 V41 H118 V49 H99 V58 H122 V67 H88 Z" />

            {/* Letter R */}
            <path d="M130,24 H153 C163,24 168,28 168,37 C168,43 163,47 154,48 L169,67 H156 L143,50 H141 V67 H130 Z M141,32 V43 H151 C155,43 157,41 157,37.5 C157,34 155,32 151,32 Z" />

            {/* Letter O */}
            <path d="M195,23 C209,23 218,32 218,45 C218,58 209,68 195,68 C181,68 172,58 172,45 C172,32 181,23 195,23 Z M195,32 C187,32 182,37.5 182,45 C182,52.5 187,58 195,58 C203,58 208,52.5 208,45 C208,37.5 203,32 195,32 Z" />

            {/* Breve Accent over G (Ğ) */}
            <polygon points="233,14 255,10 255,16 233,20" fill={resolvedTextColor} />

            {/* Letter Ğ */}
            <path d="M246,23 C259,23 268,32 268,45 C268,58 258,68 245,68 C231,68 222,58 222,45 C222,32 232,23 246,23 Z M245,32 C237.5,32 232.5,37.5 232.5,45 C232.5,52.5 237.5,58 245,58 C252,58 257,53.5 257,47.5 H247 V40 H267 C267.5,42 268,43.5 268,45" />

            {/* Letter L */}
            <path d="M275,24 H286 V58 H309 V67 H275 Z" />

            {/* Letter U */}
            <path d="M316,24 H327 V50 C327,55 330,58.5 336,58.5 C342,58.5 345,55 345,50 V24 H356 V50 C356,62 348,68 336,68 C324,68 316,62 316,50 Z" />
          </g>
        )}
      </svg>
    </div>
  );
};
