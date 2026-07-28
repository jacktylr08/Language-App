'use client';

import { useEffect, useRef } from 'react';

/**
 * A one-shot confetti burst for the end of a lesson.
 *
 * Canvas rather than DOM nodes: a few hundred animated elements in React
 * would thrash the reconciler on exactly the frame the learner is meant to
 * feel good. This draws into a single fixed canvas, runs for about two
 * seconds, and then stops the loop entirely — no permanent rAF ticking in
 * the background.
 *
 * Honours prefers-reduced-motion by simply not running. Someone who has
 * asked their OS for less movement should not be handed a screen of it.
 */

const COLOURS = ['#2E9463', '#EDA417', '#C4573F', '#5FBF8B', '#F0C86B'];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  colour: string;
}

export function Confetti({ count = 90, duration = 2200 }: { count?: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Two launch points at the lower corners, firing inward and up — a single
    // centre burst reads as a rocket, two reads as a celebration.
    const pieces: Piece[] = Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      return {
        x: left ? W * 0.12 : W * 0.88,
        y: H * 0.72,
        vx: (left ? 1 : -1) * (2 + Math.random() * 5),
        vy: -(9 + Math.random() * 7),
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 7,
        colour: COLOURS[i % COLOURS.length],
      };
    });

    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W, H);

      for (const p of pieces) {
        p.vy += 0.32; // gravity
        p.vx *= 0.992; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // Fade out over the last third rather than vanishing on a frame.
        ctx.globalAlpha = Math.max(0, Math.min(1, (duration - elapsed) / (duration * 0.35)));
        ctx.fillStyle = p.colour;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < duration) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [count, duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
