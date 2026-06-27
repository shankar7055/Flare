import React from "react";

const DialAfterSvg = () => (
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
      <radialGradient id="after-greenBody">
        <stop offset="0%" stopColor="#7EF4CF" />
        <stop offset="100%" stopColor="#1DD6BE" />
      </radialGradient>
      <filter id="after-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.35" />
      </filter>
    </defs>
    <path
      d="M40 38 Q110 -5 180 38 L160 74 Q110 52 60 74 Z"
      fill="#202020"
    />
    <path
      d="M150 24 L124 72 L158 76 Z"
      fill="#22D3A9"
    />
    <circle
      cx="110"
      cy="145"
      r="92"
      fill="url(#after-greenBody)"
      stroke="#303030"
      strokeWidth="5"
      filter="url(#after-shadow)"
    />
    <path
      fill="white"
      d="M110 108 C104 120 98 126 84 130 C98 134 104 140 110 154 C116 140 122 134 136 130 C122 126 116 120 110 108Z"
    />
    <path
      fill="white"
      d="M82 126 C80 136 72 142 62 145 C72 148 80 154 82 164 C84 154 92 148 102 145 C92 142 84 136 82 126Z"
    />
    <path
      fill="white"
      d="M138 126 C136 136 128 142 118 145 C128 148 136 154 138 164 C140 154 148 148 158 145 C148 142 140 136 138 126Z"
    />
  </svg>
);

export default React.memo(DialAfterSvg);
