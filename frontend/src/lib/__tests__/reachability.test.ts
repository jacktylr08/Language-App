/**
 * Every screen the app can render has to be reachable from inside the app.
 *
 * This exists because "Smart Practice" shipped fully built — its own queue
 * builder, start screen, title, subtitle and completion screen — with no
 * link to it anywhere. Nothing failed; the FSRS scheduler just quietly
 * scheduled reviews nobody was ever invited to do. A unit test can't tell
 * you a feature is unloved, but it can tell you a route has no href
 * pointing at it, which is the same thing in practice.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Every internal path referenced by an href, router.push, or redirect. */
function linkedPaths(): Set<string> {
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    // href="/x" (JSX), href: '/x' (a link defined in a config array),
    // href={`/x?y`}, router.push('/x'), router.replace('/x')
    for (const m of text.matchAll(
      /(?:href[=:]\s*|router\.(?:push|replace)\(|redirectTo\s*=\s*)[{(]?['"`](\/[^'"`?\s]*)/g
    )) {
      found.add(m[1].replace(/\/$/, '') || '/');
    }
  }
  return found;
}

describe('every route is reachable from somewhere in the app', () => {
  const linked = linkedPaths();

  // Routes reached from outside the app's own navigation legitimately have no
  // inbound href. Everything else must.
  const ENTRY_POINTS = [
    '/', // a fresh visitor
    '/login',
    '/register',
    '/onboarding',
    // Served by the service worker as the fallback when an uncached route is
    // opened offline — nothing in the app links to it, and nothing should.
    '/offline',
  ];

  const routes = sourceFiles(path.join(SRC, 'app'))
    .filter((f) => path.basename(f) === 'page.tsx')
    .map((f) => {
      const rel = path.relative(path.join(SRC, 'app'), path.dirname(f));
      return rel === '' ? '/' : `/${rel}`;
    })
    // Dynamic segments are linked via template literals, which the regex
    // above captures only up to the ${ — check the static parent instead.
    .filter((r) => !r.includes('['));

  it.each(routes.filter((r) => !ENTRY_POINTS.includes(r)))('%s is linked from somewhere', (route) => {
    expect(linked).toContain(route);
  });

  it('links the practice session itself, not only its mistakes variant', () => {
    // The specific regression: /practice?mode=mistakes existed, bare
    // /practice did not, so the spaced-repetition session was unreachable.
    expect(linked).toContain('/practice');
  });
});
