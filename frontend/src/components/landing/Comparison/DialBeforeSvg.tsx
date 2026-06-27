import React from "react";

const DialBeforeSvg = () => (
  <svg
    width="220"
    height="260"
    viewBox="0 0 220 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    aria-hidden
  >
    <defs>
      <radialGradient id="before-silverBody">
        <stop offset="0%" stopColor="#F8F8F8" />
        <stop offset="100%" stopColor="#D5D5D5" />
      </radialGradient>
      <radialGradient id="before-metal">
        <stop offset="0%" stopColor="#FDFDFD" />
        <stop offset="35%" stopColor="#D5D5D5" />
        <stop offset="70%" stopColor="#8D8D8D" />
        <stop offset="100%" stopColor="#F8F8F8" />
      </radialGradient>
      <filter id="before-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.35" />
      </filter>
    </defs>
    <path
      d="M40 38 Q110 -5 180 38 L160 74 Q110 52 60 74 Z"
      fill="#1E1E1E"
    />
    <path
      d="M60 36 L86 74 L56 90 Z"
      fill="#1E1E1E"
    />
    <circle
      cx="110"
      cy="145"
      r="92"
      fill="url(#before-silverBody)"
      stroke="#303030"
      strokeWidth="5"
      filter="url(#before-shadow)"
    />
    <circle
      cx="110"
      cy="145"
      r="28"
      fill="url(#before-metal)"
      stroke="#BDBDBD"
      strokeWidth="2"
    />
  </svg>
);

export default React.memo(DialBeforeSvg);
