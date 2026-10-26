import { describe, expect, it } from 'vitest';

// /admin/settings depends only downward: features/settings composes the plug-ins (messaging,
// integrations, custom-config, the catalogue, templates), which use the page kit in
// components/settings and the data access in lib; nothing points back up.

const raw = import.meta.glob<string>(['../../../**/*.{ts,tsx}'], { query: '?raw', import: 'default', eager: true });

/** A path under apps/web/src ('features/settings/x.ts'), with `.` and `..` folded. */
function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return out.join('/');
}

/** The glob key ('../../lib/api.ts', './x.ts') as a path under src. */
const srcPath = (key: string): string => normalize(`features/platform/settings/${key}`);
const sources = Object.fromEntries(Object.entries(raw).map(([key, source]) => [srcPath(key), source]));

/** Every module a source imports, re-exports, lazy-imports or mocks, resolved under src (externals dropped). */
function imports(file: string, source: string): string[] {
  const dir = file.split('/').slice(0, -1).join('/');
  const specs = [...source.matchAll(/(?:from|import|vi\.mock)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '');
  return specs.flatMap((s) => (s.startsWith('@/') ? [normalize(s.slice(2))] : s.startsWith('.') ? [normalize(`${dir}/${s}`)] : []));
}

const inFolder = (path: string, folder: string): boolean => path === folder || path.startsWith(`${folder}/`);
const isTest = (file: string): boolean => /\.test\.tsx?$/.test(file);

/** `file → import` for every import of `folder` from the files `from` selects. */
function hits(folder: string, from: (file: string) => boolean): string[] {
  return Object.entries(sources)
    .filter(([file]) => from(file))
    .flatMap(([file, source]) => imports(file, source).filter((target) => inFolder(target, folder)).map((target) => `${file} → ${target}`));
}

describe('apps/web/src settings boundaries', () => {
  it('scans the sources', () => {
    expect(Object.keys(sources)).toEqual(
      expect.arrayContaining(['features/platform/settings/pages/CommunicationsPage.tsx', 'lib/settings/settings-api.ts', 'components/settings/Section.tsx']),
    );
  });

  it('only the /admin/settings routes (and the /admin/communications alias) import features/settings from outside it', () => {
    const outside = (file: string) => !inFolder(file, 'features/platform/settings');
    const found = hits('features/platform/settings', outside);
    expect(found).toEqual(expect.arrayContaining(['routes/admin/settings.communications.tsx → features/platform/settings/pages/CommunicationsPage']));
    expect(found.filter((hit) => !/^routes\/admin\/(settings(\.[a-z]+)?|communications)\.tsx → /.test(hit))).toEqual([]);
  });

  it('the old single settings page is gone (docs/26 26-P3: hub + module pages)', () => {
    const old = ['SettingsPage', 'SettingsBody', 'SettingsNav', 'page-sections', 'use-nothing-matches', 'sections/MessagingSection'];
    expect(Object.keys(sources).filter((f) => old.some((name) => f.startsWith(`features/platform/settings/${name}.`)))).toEqual([]);
  });

  it('nothing imports features/config (renamed to features/custom-config), and the legacy page files are gone', () => {
    expect(hits('features/config', () => true)).toEqual([]);
    const legacy = Object.keys(sources).filter((f) => inFolder(f, 'features/config') || /^features\/messaging\/Settings(Page|Sections|Nav|Fields)/.test(f));
    expect(legacy).toEqual([]);
  });

  it('components/settings and lib import no feature folder (tests may use the shared test utils)', () => {
    const kit = (file: string) => (inFolder(file, 'components/settings') || inFolder(file, 'lib')) && !isTest(file);
    expect(hits('features', kit)).toEqual([]);
  });

  it('the scanner resolves aliases, relative paths and mocks', () => {
    expect(srcPath('../../../lib/api.ts')).toBe('lib/api.ts');
    expect(srcPath('./sections/SalesSection.tsx')).toBe('features/platform/settings/sections/SalesSection.tsx');
    const source = "import { a } from '@/features/settings/x';\nimport { b } from '../config/y';\nvi.mock('@/features/z', () => ({}));\nimport 'react';";
    expect(imports('features/inbox/w.ts', source)).toEqual(['features/settings/x', 'features/config/y', 'features/z']);
    expect(inFolder('features/settings-other/x', 'features/settings')).toBe(false);
  });
});
