import React from 'react';

interface LogoGraphicProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const LogoGraphic: React.FC<LogoGraphicProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-white shadow-md select-none overflow-hidden shrink-0 ${sizeMap[size]} ${className}`}
      title="Official BIGGUY_littleboat Emblem"
    >
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Circle */}
        <circle cx="200" cy="200" r="196" fill="#FFFFFF" />

        {/* Outer Circular Border */}
        <circle
          cx="200"
          cy="200"
          r="185"
          fill="none"
          stroke="#000000"
          strokeWidth="14"
        />

        {/* Curved Path for Text "BIGGUY_littleboat" */}
        <defs>
          <path
            id="logoTextArc"
            d="M 52 200 A 148 148 0 1 1 348 200"
            fill="none"
          />
        </defs>

        {/* Top Arch Text matching the official logo */}
        <text
          fill="#000000"
          fontSize="36"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Arial Black', Impact, sans-serif"
          letterSpacing="2"
          textAnchor="middle"
        >
          <textPath href="#logoTextArc" startOffset="50%">
            BIGGUY_littleboat
          </textPath>
        </text>

        {/* Inner Art Group */}
        <g id="emblem-illustration">
          
          {/* Water Base & Waves */}
          {/* Base Water fill / mask in lower semicircle */}
          <path
            d="M 68 245 
               Q 110 232, 150 248 
               T 230 246 
               T 310 248 
               C 330 250, 332 260, 332 265
               A 146 146 0 0 1 68 265 Z"
            fill="#000000"
            opacity="0.06"
          />

          {/* Water Swirls & Wave crest lines */}
          <path
            d="M 72 254 Q 105 240 140 254 T 210 254 T 280 254 T 328 254"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 85 272 Q 125 258 165 272 T 245 272 T 315 272"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 110 290 Q 155 278 200 290 T 290 290"
            stroke="#000000"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 140 308 Q 185 298 230 308 T 270 308"
            stroke="#000000"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Jon Boat / Skiff Hull */}
          {/* Outboard Motor on Transom */}
          <path
            d="M 78 226 L 90 226 L 88 246 L 76 246 Z"
            fill="#000000"
          />
          <path
            d="M 74 220 C 74 216 78 214 84 214 C 90 214 94 216 94 220 L 92 230 L 76 230 Z"
            fill="#000000"
          />
          <path
            d="M 72 240 L 80 248 L 74 250 Z"
            fill="#000000"
          />

          {/* Boat Body */}
          <path
            d="M 84 234 
               L 95 254 
               L 260 254 
               C 275 254, 290 246, 298 226 
               L 278 232 
               L 96 232 
               Z"
            fill="#000000"
          />

          {/* Angler (Big Guy) Silhouette */}
          {/* Back & Torso */}
          <path
            d="M 125 232 
               C 120 215, 122 195, 134 182 
               C 142 174, 158 174, 168 184 
               C 178 194, 185 204, 196 206 
               L 204 200 
               C 208 202, 206 210, 198 214 
               L 186 216 
               C 180 226, 188 232, 194 232 
               L 180 234 
               L 165 230 
               L 145 234 
               Z"
            fill="#000000"
          />

          {/* Angler Head & Cap Profile */}
          <circle cx="148" cy="168" r="14" fill="#000000" />
          {/* Cap Visor Bill facing right toward the rod */}
          <path
            d="M 144 160 C 152 158, 162 160, 168 166 L 158 170 Z"
            fill="#000000"
          />

          {/* Angler Arms gripping rod */}
          <path
            d="M 158 188 
               C 170 190, 186 194, 198 198 
               L 194 206 
               C 182 202, 168 198, 156 196 
               Z"
            fill="#000000"
          />

          {/* Deeply Loaded Heavy Fishing Rod (Arcs from hands up and over to the right) */}
          <path
            d="M 188 204 
               C 200 170, 222 145, 252 142 
               C 275 140, 292 155, 296 172"
            fill="none"
            stroke="#000000"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Rod Guides / Wrap Accents */}
          <line x1="228" y1="152" x2="231" y2="148" stroke="#000000" strokeWidth="4" />
          <line x1="258" y1="142" x2="261" y2="138" stroke="#000000" strokeWidth="4" />
          <line x1="284" y1="154" x2="288" y2="151" stroke="#000000" strokeWidth="4" />

          {/* Taut Fishing Line descending from rod tip to the fish mouth */}
          <path
            d="M 296 172 L 282 270"
            stroke="#000000"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Trophy Catfish Breaching Surface */}
          {/* Fish Body */}
          <path
            d="M 282 270 
               C 270 262, 250 270, 235 284 
               C 225 294, 218 304, 202 308 
               C 208 300, 218 290, 230 280 
               C 245 266, 268 254, 285 258 
               C 294 262, 290 270, 282 270 
               Z"
            fill="#000000"
          />

          {/* Catfish Head, Mouth & Barbels (Whiskers) */}
          {/* Main Upper Whiskers */}
          <path
            d="M 285 264 C 298 260, 308 266, 304 278"
            fill="none"
            stroke="#000000"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 282 272 C 294 274, 300 282, 296 290"
            fill="none"
            stroke="#000000"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Lower Chin Barbels */}
          <path
            d="M 276 276 C 282 284, 286 288, 284 294"
            fill="none"
            stroke="#000000"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Catfish Dorsal & Pectoral Fins */}
          <path
            d="M 264 260 L 255 248 L 250 262 Z"
            fill="#000000"
          />
          <path
            d="M 270 274 L 264 286 L 258 276 Z"
            fill="#000000"
          />

          {/* Catfish Forked Tail Fin */}
          <path
            d="M 206 306 
               L 190 296 
               L 196 308 
               L 186 318 
               L 204 312 
               Z"
            fill="#000000"
          />

          {/* Water Splash & Droplets near fish */}
          <circle cx="298" cy="254" r="3" fill="#000000" />
          <circle cx="306" cy="262" r="2.5" fill="#000000" />
          <circle cx="288" cy="248" r="2" fill="#000000" />
          <circle cx="218" cy="274" r="2.5" fill="#000000" />
        </g>
      </svg>
    </div>
  );
};
