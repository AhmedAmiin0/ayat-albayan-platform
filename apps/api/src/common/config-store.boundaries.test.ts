import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { API_SRC } from '@/common/db/repo-paths.test-util';

// docs/26 §2e boundary tests: config-store imports no consumer (only shared helpers); the settings
// table is touched only where listed below.

const SRC = API_SRC;

const files = (dir: string): string[] =>
  readdirSync(join(SRC, dir), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.fakes.ts') && !f.includes('test-util') && !f.includes('test-app'))
    .map((f) => join(SRC, dir, f));

/** Where a `./`, `../` or `@/` specifier lands, relative to src/ (posix). */
const target = (file: string, spec: string): string =>
  spec.startsWith('@/') ? join(SRC, spec.slice(2)) : resolve(dirname(file), spec);

const relImports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]((?:\.|@\/)[^'"]+)['"]/g)].map((m) =>
    relative(SRC, target(file, m[1] ?? '')).split(sep).join('/'),
  );

/** What config-store may import outside itself: infrastructure (incl. the process-role gate of its seeder and the config-reload kick) and the one parse helper. */
const STORE_MAY_IMPORT = [/^common\/(db|auth|audit|cache)\//, /^config\/env\/env$/, /^config\/role\/(background-job|worker-kick)$/, /^common\/http\/http$/];

/**
 * Raw `settings` / `custom_config` table access allowed TODAY. common/config-store is the target;
 * the others are legacy and go with the read switch / phase 5 (docs/26 §4, §6). Do not add to it.
 */
const TABLE_ACCESS_ALLOWED = [
  'common/config-store/store/config-store.queries.ts',
  'common/settings/settings.service.ts', // legacy read until the read switch
  'common/settings/settings-meta.queries.ts', // GET /config/meta
  'common/custom-config/custom-config.service.ts', // until phase 5 folds custom_config in
  'modules/platform/google-sync/google-settings.ts', // fresh Google read + PUT /admin/google/settings
  'modules/messaging/whatsapp/whatsapp.settings.ts', // the send gate's uncached primary-key read (docs/26 §5 26-P4), never cached
];

describe('config-store boundaries (docs/26 §2e)', () => {
  it('config-store imports no consumer module (settings, custom-config, public-config, modules/*)', () => {
    const bad = files('common/config-store').flatMap((f) =>
      relImports(f)
        .filter((t) => !t.startsWith('common/config-store/') && !STORE_MAY_IMPORT.some((re) => re.test(t)))
        .map((t) => `${relative(SRC, f)} → ${t}`),
    );
    expect(bad).toEqual([]);
  });

  it('common/settings imports only config-store among the config folders', () => {
    const bad = files('common/settings').flatMap((f) =>
      relImports(f)
        .filter((t) => ['common/custom-config', 'common/public-config'].some((p) => t === p || t.startsWith(`${p}/`)))
        .map((t) => `${relative(SRC, f)} → ${t}`),
    );
    expect(bad).toEqual([]);
  });

  it(".from('settings') / .from('custom_config') only in the listed files", () => {
    const all = [...files('common'), ...files('modules'), ...files('scripts')];
    const hits = all
      .filter((f) => /\.from\(\s*['"](settings|custom_config)['"]\s*\)/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(SRC, f).split(sep).join('/'));
    expect(hits.sort()).toEqual([...TABLE_ACCESS_ALLOWED].sort());
  });
});
