import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Settings, custom values and the public config are three modules with a one-way graph:
// public-config → custom-config and public-config → settings. Settings knows neither; custom
// values know neither settings nor the public config. The old shared config folder stays gone.

const COMMON = __dirname;

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

/** The common/ folder a relative import of `file` lands in; null for a package or outside common/. */
function landsIn(file: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const rel = relative(COMMON, resolve(dirname(file), spec));
  if (rel.startsWith('..')) return null;
  return rel.split(sep)[0] ?? null;
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
    const names = ['settings', 'custom-config', 'public-config'].flatMap((f) => sources(f).map((p) => relative(COMMON, p)));
    expect(names).toEqual(
      expect.arrayContaining([
        join('settings', 'settings.module.ts'),
        join('custom-config', 'custom-config.module.ts'),
        join('public-config', 'public-config.module.ts'),
      ]),
    );
  });

  it('common/settings imports nothing from custom-config or public-config', () => {
    expect(crossings('settings', ['custom-config', 'public-config'])).toEqual([]);
  });

  it('common/custom-config imports nothing from settings or public-config', () => {
    expect(crossings('custom-config', ['settings', 'public-config'])).toEqual([]);
  });

  it('the old shared config folder does not come back', () => {
    expect(existsSync(join(COMMON, 'config'))).toBe(false);
  });

  it('the scanner sees a crossing when there is one', () => {
    const file = join(COMMON, 'settings', 'settings.module.ts');
    expect(landsIn(file, '../custom-config/custom-config.module')).toBe('custom-config');
    expect(landsIn(file, '../../common/public-config/public-config.module')).toBe('public-config');
    expect(landsIn(file, './settings.service')).toBe('settings');
    expect(landsIn(file, '../../modules/teachers/http')).toBeNull();
    expect(landsIn(file, '@ab/shared')).toBeNull();
    expect(specifiers("import type { A } from '../a';\nexport * from './b';\nimport './c';\nconst d = import('../d');")).toEqual(['../a', './b', './c', '../d']);
  });
});
