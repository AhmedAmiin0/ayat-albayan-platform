import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_SRC } from '@/common/db/repo-paths.test-util';

// Settings, custom values and the public config are three modules with a one-way graph:
// public-config → custom-config and public-config → settings. Settings knows neither; custom
// values know neither settings nor the public config. The old shared config folder stays gone.

const COMMON = join(API_SRC, 'common');

/** Every .ts file under common/<folder>. */
function sources(folder: string): string[] {
  return readdirSync(join(COMMON, folder), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(COMMON, folder, f));
}

/** Every module specifier a source imports, re-exports or requires. */
const specifiers = (source: string): string[] =>
  [
    ...source.matchAll(
      /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g,
    ),
  ].map((m) => m[1] ?? m[2] ?? m[3] ?? '');

/** The three config folders, relative to common/ (posix). */
const SETTINGS = 'settings';
const CUSTOM = 'custom-config';
const PUBLIC = 'public-config';

/** The config folder a `./`, `../` or `@/` import of `file` lands in; null for anything else. */
function landsIn(file: string, spec: string): string | null {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null;
  const abs = spec.startsWith('@/') ? join(API_SRC, spec.slice(2)) : resolve(dirname(file), spec);
  const rel = relative(COMMON, abs).split(sep).join('/');
  return [SETTINGS, CUSTOM, PUBLIC].find((f) => rel === f || rel.startsWith(`${f}/`)) ?? null;
}

/** `file → specifier` for each import from common/<from> into one of the `forbidden` folders. */
function crossings(from: string, forbidden: readonly string[]): string[] {
  return sources(from).flatMap((file) =>
    specifiers(readFileSync(file, 'utf8'))
      .filter((spec) => forbidden.includes(landsIn(file, spec) ?? ''))
      .map((spec) => `${relative(COMMON, file)} → ${spec}`),
  );
}

describe('settings / custom-config / public-config boundaries', () => {
  it('scans the three folders', () => {
    const names = [SETTINGS, CUSTOM, PUBLIC].flatMap((f) => sources(f).map((p) => relative(COMMON, p)));
    expect(names).toEqual(
      expect.arrayContaining([
        join(SETTINGS, 'settings.module.ts'),
        join(CUSTOM, 'custom-config.module.ts'),
        join(PUBLIC, 'public-config.module.ts'),
      ]),
    );
  });

  it('common/settings imports nothing from custom-config or public-config', () => {
    expect(crossings(SETTINGS, [CUSTOM, PUBLIC])).toEqual([]);
  });

  it('common/custom-config imports nothing from settings or public-config', () => {
    expect(crossings(CUSTOM, [SETTINGS, PUBLIC])).toEqual([]);
  });

  it('the old shared config folder does not come back', () => {
    expect(existsSync(join(COMMON, 'config'))).toBe(false);
  });

  it('the scanner sees a crossing when there is one', () => {
    const file = join(COMMON, SETTINGS, 'settings.module.ts');
    expect(landsIn(file, '../custom-config/custom-config.module')).toBe(CUSTOM);
    expect(landsIn(file, '../../common/public-config/public-config.module')).toBe(PUBLIC);
    expect(landsIn(file, '@/common/custom-config/custom-config.module')).toBe(CUSTOM);
    expect(landsIn(file, './settings.service')).toBe(SETTINGS);
    expect(landsIn(file, '@/common/db/db.module')).toBeNull();
    expect(landsIn(file, '../../modules/teachers/http')).toBeNull();
    expect(landsIn(file, '@ab/shared')).toBeNull();
    expect(specifiers("import type { A } from '../a';\nexport * from './b';\nimport './c';\nconst d = import('../d');")).toEqual(['../a', './b', './c', '../d']);
  });
});
