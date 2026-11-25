// Throw-away monorepos for the package-boundary gate's tests: git-tracked, like the real tree.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const NAMES = {
  'apps/api': 'api',
  'apps/staff-web': 'staff-web',
  'apps/family-web': 'family-web',
  'packages/config': '@ab/config',
  'packages/testing': '@ab/testing',
  'packages/core': '@ab/core',
  'packages/db': '@ab/db',
  'packages/time': '@ab/time',
  'packages/i18n': '@ab/i18n',
  'packages/schedule': '@ab/schedule',
  'packages/web-kit': '@ab/web-kit',
  'packages/mobile-kit': '@ab/mobile-kit',
  'tools/wa-stub': 'wa-stub',
  e2e: 'e2e',
};

const WORKSPACE = 'packages:\n  - apps/*\n  - packages/*\n  - tools/*\n  - e2e\n';

const manifests = (extra) =>
  Object.entries(NAMES).map(([dir, name]) => [
    `${dir}/package.json`,
    JSON.stringify({ name, ...extra[name] }),
  ]);

/** A git repo of the workspaces above plus `files`; `deps` adds manifest fields by name. */
export function makeRepo(files, deps = {}) {
  const root = mkdtempSync(join(tmpdir(), 'guard-packages-'));
  const all = [['pnpm-workspace.yaml', WORKSPACE], ...manifests(deps), ...Object.entries(files)];
  for (const [path, text] of all) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '-A'], { cwd: root });
  return root;
}

const DOMAIN = ['@ab/core', '@ab/time', '@ab/i18n', '@ab/schedule'];

/** A small layer table over the workspaces above. */
export const table = () => ({
  layers: [
    { name: 'T', packages: ['@ab/config', '@ab/testing'] },
    { name: 'L0', packages: ['@ab/core'] },
    { name: 'L0db', packages: ['@ab/db'] },
    { name: 'L1', packages: ['@ab/time', '@ab/i18n'] },
    { name: 'L2', packages: ['@ab/schedule'] },
    { name: 'L5', packages: ['@ab/web-kit', '@ab/mobile-kit'] },
    { name: 'L6', packages: ['api', 'staff-web', 'family-web'] },
    { name: 'tools', packages: ['wa-stub'] },
    { name: 'harness', packages: ['e2e'] },
  ],
  apps: 'L6',
  allowed: {
    '@ab/time': ['@ab/core'],
    '@ab/i18n': ['@ab/core'],
    '@ab/schedule': ['@ab/core', '@ab/time'],
    '@ab/web-kit': DOMAIN,
    api: ['@ab/db', ...DOMAIN],
    'staff-web': ['@ab/web-kit', ...DOMAIN],
    'family-web': ['@ab/web-kit', ...DOMAIN],
    e2e: DOMAIN,
  },
  appsBuildOnly: { e2e: ['api', 'staff-web'] },
  pathReach: { e2e: ['api', 'wa-stub'], 'wa-stub': '*' },
});
