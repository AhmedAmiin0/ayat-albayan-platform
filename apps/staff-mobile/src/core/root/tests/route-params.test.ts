import { Observe } from 'expo-observe';
import { z } from 'zod';
import '@/core/root';

interface Dirent {
  name: string;
  parentPath: string;
}
interface Fs {
  readdirSync(path: string, opts: { withFileTypes: true; recursive: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
const fs = jest.requireActual<Fs>('fs');
declare const __dirname: string;
const APP = `${__dirname}/../../../../app`;
const SRC = `${__dirname}/../../..`;
const SEGMENT = /^\[(?:\.\.\.)?(\w+)\]/;
const INLINE_PARAMS = /use(?:Local|Global)SearchParams<\{([^}]*)\}>/g;
const KEY = /(\w+)\??:/g;
const routerOptions = z.object({
  integrations: z.object({ 'expo-router': z.object({ filteredParams: z.array(z.string()) }) }),
});

const entries = (dir: string) => fs.readdirSync(dir, { withFileTypes: true, recursive: true });

/** `[id]` / `[...rest]` in every route folder and file name under app/. */
function dynamicSegments(): Set<string> {
  const names = entries(APP).map((e) => SEGMENT.exec(e.name)?.[1]);
  return new Set(names.filter((n) => n !== undefined));
}

/** The keys of every inline `useLocalSearchParams<{ … }>` in the app's code. */
function inlineQueryKeys(): Set<string> {
  const files = [...entries(APP), ...entries(SRC)].filter((e) => /\.tsx?$/.test(e.name));
  const sources = files.map((e) => fs.readFileSync(`${e.parentPath}/${e.name}`, 'utf8'));
  const bodies = sources.flatMap((s) => [...s.matchAll(INLINE_PARAMS)].map((m) => m[1] ?? ''));
  return new Set(bodies.flatMap((b) => [...b.matchAll(KEY)].map((m) => m[1] ?? '')));
}

function filtered(): string[] {
  const [options] = jest.mocked(Observe.configure).mock.calls[0] ?? [];
  return routerOptions.parse(options).integrations['expo-router'].filteredParams;
}

test('the route tree has dynamic segments to filter', () => {
  expect(dynamicSegments()).toContain('studentId');
});

test('every dynamic segment of the route tree is filtered', () => {
  const missing = [...dynamicSegments()].filter((name) => !filtered().includes(name));
  expect(missing).toEqual([]);
});

test('every inline search param key read by a screen is filtered', () => {
  const missing = [...inlineQueryKeys()].filter((name) => !filtered().includes(name));
  expect(missing).toEqual([]);
});

test('the list names each param once', () => {
  expect(new Set(filtered()).size).toBe(filtered().length);
});
