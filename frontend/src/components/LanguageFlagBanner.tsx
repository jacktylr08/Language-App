'use client';

import { useEffect, useState } from 'react';
import { getActiveLanguage, LANGUAGE_CHANGE_EVENT, type CourseLanguage } from '@/lib/languages';

const VIEW_W = 400;
const VIEW_H = 900;

// A gentle 4-ripple silhouette for the flag's free (right) edge — smooth
// bezier curves, not noise, so the flag reads clearly as a flag rather than
// an abstract blob. Left/top/bottom stay straight (the pole side + frame).
const WAVE_PATH = `M0,0 L360,0 Q400,112 350,225 Q300,337 380,450 Q400,562 330,675 Q300,787 370,900 L0,900 Z`;

/**
 * A large, faint waving flag along the left edge of the screen — the
 * course's ambient identity. The silhouette is a hand-tuned wave (four soft
 * ripples); a subtle turbulence filter adds a touch of organic cloth texture
 * to the fill without breaking up the shape itself. Reads the active
 * language live (and re-reads on LANGUAGE_CHANGE_EVENT) rather than a value
 * frozen at first import.
 */
export function LanguageFlagBanner() {
  const [language, setLanguage] = useState<CourseLanguage>(() => getActiveLanguage());

  useEffect(() => {
    const refresh = () => setLanguage(getActiveLanguage());
    window.addEventListener(LANGUAGE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(LANGUAGE_CHANGE_EVENT, refresh);
  }, []);

  let y = 0;
  const bands = language.flagBands.map((band, i) => {
    const height = band.weight * VIEW_H;
    const rect = { y, height, color: band.color };
    y += height;
    return <rect key={i} x={0} y={rect.y} width={VIEW_W} height={rect.height} fill={rect.color} />;
  });

  return (
    <div className="ambient-flag" aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="flagTexture" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.035" numOctaves={2} seed={7} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <clipPath id="flagShape">
            <path d={WAVE_PATH} />
          </clipPath>
        </defs>
        <g clipPath="url(#flagShape)">
          <g filter="url(#flagTexture)">{bands}</g>
        </g>
      </svg>
    </div>
  );
}
