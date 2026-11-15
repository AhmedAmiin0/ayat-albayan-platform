// Every direct upload goes through upload-slot.ts (docs/45): it routes by the storage marker.

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
const SRC = `${__dirname}/../../..`;
const HELPER = 'core/lib/http/upload-slot.ts';
const FORBIDDEN = /uploadToSignedUrl|\.storage\s*\.from\(/;
const SKIP = new Set(['test', 'node_modules']);
const isCode = (name: string) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name);

function codeFiles(dir: string): string[] {
  return fs.readdirSync(`${SRC}/${dir}`, { withFileTypes: true }).flatMap((e) => {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : codeFiles(rel);
    return isCode(e.name) ? [rel] : [];
  });
}

test('the scan sees the app', () => {
  expect(codeFiles('')).toContain(HELPER);
});

test('only upload-slot.ts talks to Supabase Storage', () => {
  const offenders = codeFiles('')
    .filter((rel) => rel !== HELPER)
    .filter((rel) => FORBIDDEN.test(fs.readFileSync(`${SRC}/${rel}`, 'utf8')));
  expect(offenders).toEqual([]);
});
