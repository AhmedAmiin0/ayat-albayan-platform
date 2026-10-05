import { arabicLiterals } from '@ab/shared';
import allow from './i18n-literals.allow.json';

// «Nothing untranslated» (owner, 2026-10-05): no Arabic in string literals or JSX text of the
// app's screens and components (src/ and the expo-router app/). Copy lives in ar.json / en.json.
// A justified exception goes in i18n-literals.allow.json with its reason.

interface Dirent {
  name: string;
  isDirectory(): boolean;
}
interface Fs {
  readdirSync(path: string, opts: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
const fs = jest.requireActual<Fs>('fs');
declare const __dirname: string;
const ROOT = `${__dirname}/..`;

function tsxFiles(dir: string): string[] {
  return fs.readdirSync(`${ROOT}/${dir}`, { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return tsxFiles(rel);
    return e.name.endsWith('.tsx') && !e.name.includes('.test.') ? [rel] : [];
  });
}

const allowed = new Set(Object.keys(allow.files));
const files = [...tsxFiles('src'), ...tsxFiles('app')].filter((f) => !allowed.has(f));

describe('no hard-coded Arabic in apps/mobile', () => {
  it('scans the screens and components', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('every .tsx takes its words from i18n', () => {
    const hits = files.flatMap((f) => arabicLiterals(fs.readFileSync(`${ROOT}/${f}`, 'utf8')).map((h) => `${f}:${h.line} ${h.text}`));
    expect(hits).toEqual([]);
  });
});
