import { getStoredTheme, applyTheme, setTheme } from '../theme';

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system with no stored preference', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('persists and reloads an explicit choice', () => {
    setTheme('dark');
    expect(getStoredTheme()).toBe('dark');
    setTheme('light');
    expect(getStoredTheme()).toBe('light');
  });

  it('clears the stored preference when switched back to system', () => {
    mockMatchMedia(false);
    setTheme('dark');
    setTheme('system');
    expect(getStoredTheme()).toBe('system');
  });

  it('applies the .dark class for an explicit dark preference regardless of OS setting', () => {
    mockMatchMedia(false);
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the .dark class for an explicit light preference even if the OS prefers dark', () => {
    mockMatchMedia(true);
    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('follows the OS preference under system', () => {
    mockMatchMedia(true);
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    mockMatchMedia(false);
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
