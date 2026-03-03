import React, { useState } from 'react';

/**
 * Official Park Smarter logo (red car on pink–purple gradient rounded square). Use beside "Park Smarter" everywhere.
 * Source: client/public/parksmarter-logo.png
 */
const ParkSmarterLogo = ({ className = '', size = 40 }) => {
  const sizeStyle = { width: size, height: size, minWidth: size, minHeight: size };
  const [imgFailed, setImgFailed] = useState(false);
  const logoSrc = process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/parksmarter-logo.png` : '/parksmarter-logo.png';

  if (!imgFailed) {
    return (
      <img
        src={logoSrc}
        alt="Park Smarter"
        className={`object-contain flex-shrink-0 rounded-xl ${className}`}
        style={{
          ...sizeStyle,
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
        }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ ...sizeStyle, border: 'none' }}
      aria-hidden
    >
      <svg
        viewBox="0 0 48 48"
        className="w-[85%] h-[85%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 26h2l2-6 4-2h16l4 2 2 6h2v4h-2l-1 4H11l-1-4H8v-4z" fill="#dc2626" />
        <path d="M18 20h12v6H18z" fill="#7dd3fc" opacity={0.95} />
        <path d="M16 22h4v4h-4z" fill="#7dd3fc" opacity={0.9} />
        <path d="M40 24h2v2h-2z" fill="#facc15" />
        <circle cx="14" cy="32" r="3.5" fill="#5b21b6" />
        <circle cx="34" cy="32" r="3.5" fill="#5b21b6" />
      </svg>
    </div>
  );
};

export default ParkSmarterLogo;
