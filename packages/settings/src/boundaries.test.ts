import { describe, expect, it } from 'vitest';

// The settings kernel depends only downward: custom values, public config, integrations, google,
// the notification catalogue and the classroom all read settings, never the other way round.

// Vite's raw import (vitest): the shared lib has no Node typings, so the sources are read this way.
declare global {
  interface ImportMeta {
    glob<T>(pattern: string | string[], options: { query: '?raw'; import: 'default'; eager: true }): Record<string, T>;
  }
}

const sources = import.meta.glob<string>('./**/*.ts', { query: '?raw', import: 'default', eager: true });

const FORBIDDEN = ['custom-config', 'integrations', 'google', 'public-config', 'notifications', 'classroom'];

/** Every module specifier a source imports or re-exports. */
const specifiers = (source: string): string[] =>
  [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2] ?? '');

/** Does the specifier leave src/settings for a forbidden sibling folder (or file)? */
const forbidden = (path: string, spec: string): boolean => {
  const depth = path.split('/').length - 2;
  const up = `${'../'.repeat(depth + 1)}`;
  return spec.startsWith(up) && FORBIDDEN.some((f) => spec.slice(up.length).split('/')[0]?.replace(/\.js$/, '') === f);
};

describe('src/settings boundaries', () => {
  it('scans the settings sources', () => {
    expect(Object.keys(sources)).toEqual(expect.arrayContaining(['./registry.ts', './layout.ts', './domains/academy.ts']));
  });

  it('imports nothing from custom-config, integrations, google, public-config, notifications or classroom', () => {
    const hits = Object.entries(sources).flatMap(([path, source]) =>
      specifiers(source)
        .filter((spec) => forbidden(path, spec))
        .map((spec) => `${path} → ${spec}`),
    );
    expect(hits).toEqual([]);
  });

  it('the scanner sees a forbidden import when there is one', () => {
    expect(forbidden('./registry.ts', '../custom-config/index.js')).toBe(true);
    expect(forbidden('./registry.ts', '../public-config.js')).toBe(true);
    expect(forbidden('./domains/academy.ts', '../../classroom/join-window.js')).toBe(true);
    expect(forbidden('./domains/academy.ts', '../defs.js')).toBe(false);
    expect(forbidden('./schema.ts', '../phone.js')).toBe(false);
    expect(specifiers("import { a } from '../google/x.js';\nexport * from './y.js';")).toEqual(['../google/x.js', './y.js']);
  });
});
