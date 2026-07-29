/**
 * A shareable progress card.
 *
 * The app produced no artifact anyone would ever post. Duolingo's growth is
 * substantially streak screenshots and league results — not because sharing is
 * a feature people ask for, but because a visible token of effort is the one
 * thing a learner wants to show off, and each one is a recommendation their
 * friends actually trust.
 *
 * Drawn on a canvas rather than screenshotting the DOM: no html2canvas
 * dependency, no font-loading race, no risk of capturing a half-rendered
 * layout, and full control over the crop so it looks right in a story or a
 * group chat.
 */

import { getActiveLanguage } from './languages';

export interface ShareStats {
  streak: number;
  wordsKnown: number;
  lessonsDone: number;
  totalLessons: number;
}

const W = 1080;
const H = 1350; // 4:5 — the portrait crop Instagram and WhatsApp both respect.

const INK = '#16211C';
const CREAM = '#FAF7F2';
const GREEN = '#1B6742';
const GREEN_LIGHT = '#2E9463';
const SAFFRON = '#EDA417';

/** Renders the card and resolves to a PNG blob, or null if canvas is unusable. */
export async function renderShareCard(stats: ShareStats): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const language = getActiveLanguage();

  // Ground
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, GREEN_LIGHT);
  bg.addColorStop(1, GREEN);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // A large, faint tilde — the brand mark's own shape, used as texture so the
  // card is recognisable as Fluenta's even cropped.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 90;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-60, H * 0.72);
  ctx.bezierCurveTo(W * 0.2, H * 0.52, W * 0.42, H * 0.9, W * 0.62, H * 0.7);
  ctx.bezierCurveTo(W * 0.8, H * 0.52, W * 0.95, H * 0.78, W + 60, H * 0.62);
  ctx.stroke();
  ctx.restore();

  // The system font stack is used deliberately: a webfont that hasn't finished
  // loading renders as a fallback mid-draw, and the card would ship wrong.
  const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  ctx.textAlign = 'center';

  // Language + flag
  ctx.fillStyle = 'rgba(250,247,242,0.85)';
  ctx.font = `600 40px ${sans}`;
  ctx.fillText(`${language.flag}  Learning ${language.name}`, W / 2, 150);

  // The hero number: the streak, because it's the number people are proud of.
  ctx.fillStyle = CREAM;
  ctx.font = `800 320px ${sans}`;
  ctx.fillText(String(stats.streak), W / 2, 500);

  ctx.fillStyle = SAFFRON;
  ctx.font = `800 58px ${sans}`;
  ctx.fillText(stats.streak === 1 ? 'DAY STREAK' : 'DAY STREAK', W / 2, 580);

  // Supporting stats, side by side.
  const statY = 800;
  const pairs: Array<[string, string]> = [
    [String(stats.wordsKnown), stats.wordsKnown === 1 ? 'word known' : 'words known'],
    [`${stats.lessonsDone}/${stats.totalLessons}`, 'lessons done'],
  ];
  pairs.forEach(([value, label], i) => {
    const x = i === 0 ? W * 0.3 : W * 0.7;
    ctx.fillStyle = CREAM;
    ctx.font = `800 96px ${sans}`;
    ctx.fillText(value, x, statY);
    ctx.fillStyle = 'rgba(250,247,242,0.75)';
    ctx.font = `600 36px ${sans}`;
    ctx.fillText(label, x, statY + 58);
  });

  // Divider
  ctx.strokeStyle = 'rgba(250,247,242,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, statY - 80);
  ctx.lineTo(W / 2, statY + 40);
  ctx.stroke();

  // Brand lockup: a rounded square with a tilde, matching the app icon.
  const markSize = 96;
  const markX = W / 2 - 150;
  const markY = H - 260;
  ctx.fillStyle = CREAM;
  roundedRect(ctx, markX, markY, markSize, markSize, 26);
  ctx.fill();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(markX + 22, markY + 56);
  ctx.bezierCurveTo(markX + 33, markY + 34, markX + 44, markY + 40, markX + 50, markY + 48);
  ctx.bezierCurveTo(markX + 57, markY + 57, markX + 66, markY + 60, markX + 76, markY + 40);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = CREAM;
  ctx.font = `800 76px ${sans}`;
  ctx.fillText('Fluenta', markX + markSize + 26, markY + 74);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(250,247,242,0.6)';
  ctx.font = `500 34px ${sans}`;
  ctx.fillText('A tutor you can actually talk to', W / 2, H - 90);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type ShareOutcome = 'shared' | 'downloaded' | 'unavailable';

/**
 * Shares the card, falling back sensibly.
 *
 * navigator.share with a file is the good path — it opens the OS share sheet,
 * so the learner picks WhatsApp or Instagram themselves and we never touch a
 * social API. Desktop browsers mostly can't share files, so those download the
 * PNG instead, which is still something you can drag into a message.
 */
export async function shareProgress(stats: ShareStats): Promise<ShareOutcome> {
  const blob = await renderShareCard(stats);
  if (!blob) return 'unavailable';

  const language = getActiveLanguage();
  const file = new File([blob], 'fluenta-progress.png', { type: 'image/png' });
  const text = `${stats.streak} days of ${language.name} and ${stats.wordsKnown} words in.`;

  // canShare({ files }) is the only reliable check — Safari exposes
  // navigator.share but rejects files on some versions.
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'Fluenta' });
      return 'shared';
    } catch {
      // A cancelled share sheet throws; that's not a failure worth reporting,
      // and falling through to a download would be surprising.
      return 'shared';
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fluenta-progress.png';
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
