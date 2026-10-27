import React from 'react';

/**
 * HandDrawnUnderline — marker/ink style curved underline
 */
export const HandDrawnUnderline = ({
  color = '#d4ff00',
  width = '100%',
  height = 16,
  style = {},
  className = '',
}) => (
  <svg
    viewBox="0 0 240 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
    className={className}
    style={{
      width,
      height,
      display: 'block',
      overflow: 'visible',
      ...style,
    }}
    aria-hidden="true"
  >
    <path
      d="M3 13.5C48 5 112 3.5 237 9.5"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15C56 7.5 140 6 228 11.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
  </svg>
);

/**
 * HandDrawnArrow — organic curved sketch arrow pointing to a feature/product
 */
export const HandDrawnArrow = ({
  color = '#111111',
  accent = '#d4ff00',
  direction = 'down-right',
  width = 64,
  height = 48,
  style = {},
  className = '',
}) => {
  // Variations based on direction
  return (
    <svg
      viewBox="0 0 64 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        width,
        height,
        display: 'inline-block',
        overflow: 'visible',
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Hand-drawn curved stem */}
      <path
        d="M6 10 C 18 4, 38 8, 48 26 C 52 33, 53 38, 54 42"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead */}
      <path
        d="M42 36 L 54 43 L 56 30"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Accent dot / ink dab */}
      <circle cx="6" cy="10" r="3" fill={accent} />
    </svg>
  );
};

/**
 * HandDrawnCircle — organic sketched loop circling a feature or metric
 */
export const HandDrawnCircle = ({
  color = '#d4ff00',
  strokeWidth = 2.5,
  children,
  style = {},
  className = '',
}) => (
  <span
    className={className}
    style={{
      position: 'relative',
      display: 'inline-block',
      padding: '0.15em 0.4em',
      ...style,
    }}
  >
    <svg
      viewBox="0 0 160 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: '120%',
        height: '130%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      aria-hidden="true"
    >
      <path
        d="M20 30 C 16 12, 60 4, 110 8 C 145 12, 155 28, 145 44 C 132 56, 50 58, 18 46 C 4 39, 8 20, 35 15"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
    <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
  </span>
);

/**
 * HandDrawnStar — artistic 4-point editorial sparkle/star
 */
export const HandDrawnStar = ({
  color = '#d4ff00',
  size = 20,
  style = {},
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{
      width: size,
      height: size,
      color,
      display: 'inline-block',
      ...style,
    }}
    aria-hidden="true"
  >
    <path d="M12 0C12 7 7 12 0 12C7 12 12 17 12 24C12 17 17 12 24 12C17 12 12 7 12 0Z" />
  </svg>
);

/**
 * EditorialBadge — high contrast pill with electric accent
 */
export const EditorialBadge = ({
  text,
  variant = 'dark', // 'dark' | 'lime' | 'outline'
  className = '',
  style = {},
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'lime':
        return {
          backgroundColor: '#d4ff00',
          color: '#0a0a0a',
          border: '1px solid #c2eb00',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: '#0a0a0a',
          border: '1px solid #0a0a0a',
        };
      case 'dark':
      default:
        return {
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          border: '1px solid #1a1a1a',
        };
    }
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.6875rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-sans)',
        ...getStyles(),
        ...style,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: variant === 'lime' ? '#0a0a0a' : '#d4ff00',
          display: 'inline-block',
        }}
      />
      {text}
    </span>
  );
};

/**
 * HandwrittenNote — organic handwritten style label
 */
export const HandwrittenNote = ({
  children,
  rotate = -3,
  color = '#18181b',
  accentColor = '#d4ff00',
  hasArrow = false,
  className = '',
  style = {},
}) => (
  <div
    className={className}
    style={{
      fontFamily: "var(--font-handwriting, 'Caveat', 'Segoe Print', cursive)",
      fontSize: '1.25rem',
      fontWeight: 700,
      color,
      transform: `rotate(${rotate}deg)`,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      lineHeight: 1.1,
      userSelect: 'none',
      ...style,
    }}
  >
    <span>{children}</span>
    {hasArrow && (
      <HandDrawnArrow
        color={color}
        accent={accentColor}
        width={36}
        height={26}
        style={{ transform: 'rotate(15deg)' }}
      />
    )}
  </div>
);
