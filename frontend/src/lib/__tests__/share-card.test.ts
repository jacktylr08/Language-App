/**
 * The share card is the app's only outward-facing artifact, so the thing worth
 * testing is that it degrades properly: a browser that can't share files, a
 * cancelled share sheet, and a canvas that isn't available must all end in
 * something sensible rather than an error the learner sees.
 */
import { shareProgress, renderShareCard } from '../share-card';

const stats = { streak: 12, wordsKnown: 148, lessonsDone: 9, totalLessons: 54 };

/** jsdom has no real canvas; this is enough to exercise the drawing path. */
function mockCanvas(toBlobResult: Blob | null = new Blob(['x'], { type: 'image/png' })) {
  const ctx = {
    createLinearGradient: () => ({ addColorStop: jest.fn() }),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    arcTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    textAlign: '',
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    globalAlpha: 1,
  };
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  jest
    .spyOn(HTMLCanvasElement.prototype, 'toBlob')
    .mockImplementation((cb) => cb(toBlobResult));
  return ctx;
}

beforeEach(() => jest.restoreAllMocks());

describe('rendering', () => {
  it('produces a PNG blob', async () => {
    mockCanvas();
    const blob = await renderShareCard(stats);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('returns null rather than throwing when canvas is unavailable', async () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(renderShareCard(stats)).resolves.toBeNull();
  });

  it('draws the streak, the word count and the brand', async () => {
    const ctx = mockCanvas();
    await renderShareCard(stats);
    const drawn = ctx.fillText.mock.calls.map((c) => String(c[0]));
    expect(drawn).toContain('12');
    expect(drawn).toContain('148');
    expect(drawn).toContain('Fluenta');
    expect(drawn.some((t) => t.includes('9/54'))).toBe(true);
  });
});

describe('sharing', () => {
  it('uses the OS share sheet when files are supported', async () => {
    mockCanvas();
    const share = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share, canShare: () => true });

    await expect(shareProgress(stats)).resolves.toBe('shared');
    expect(share).toHaveBeenCalled();
    // The blob goes as a file, not a URL — that's what puts an image in the
    // message rather than a link.
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  });

  it('treats a cancelled share sheet as done, not as a failure', async () => {
    // Dismissing the sheet rejects. Falling back to a download at that point
    // would silently save a file the learner just declined to send.
    mockCanvas();
    Object.assign(navigator, {
      share: jest.fn().mockRejectedValue(new Error('AbortError')),
      canShare: () => true,
    });
    await expect(shareProgress(stats)).resolves.toBe('shared');
  });

  it('downloads instead when the browser cannot share files', async () => {
    mockCanvas();
    Object.assign(navigator, { share: undefined, canShare: undefined });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    global.URL.createObjectURL = jest.fn(() => 'blob:x');
    global.URL.revokeObjectURL = jest.fn();

    await expect(shareProgress(stats)).resolves.toBe('downloaded');
    expect(click).toHaveBeenCalled();
  });

  it('reports unavailable when the card could not be drawn at all', async () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await expect(shareProgress(stats)).resolves.toBe('unavailable');
  });

  it('does not fall back to a download when navigator.share exists but rejects files', async () => {
    // Some Safari versions expose share() and then throw on files — canShare
    // is the only reliable signal, which is why it's checked separately.
    mockCanvas();
    const share = jest.fn();
    Object.assign(navigator, { share, canShare: () => false });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    global.URL.createObjectURL = jest.fn(() => 'blob:x');
    global.URL.revokeObjectURL = jest.fn();

    await expect(shareProgress(stats)).resolves.toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
