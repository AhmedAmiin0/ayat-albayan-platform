// i18n bundle changes for select.mjs (node built-ins only: ci «changes» has no install): the
// files that read a changed key (i18n.mjs), the mobile apps' and their kit's readers known but
// ignored (staff-web, api and e2e never import them).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedKeys, keyUsers } from './i18n.mjs';

/** The area whose page lists every UI string: runs on any key change. */
const EVERY_KEY_AREA = 'translations';
const MOBILE = /^(apps\/(staff|family)-mobile|packages\/mobile-kit)\//;

/** The files that read a changed key of one bundle, or { reason } for the full suite. */
function bundleUsers({ root, file, base, graph: g }) {
  if (!base) return { reason: `${file} changed and there is no base commit to compare` };
  // Plain JSON.parse: ci «changes» runs this before any install, so no zod here (changedKeys walks
  // whatever the bundle holds, and a bad bundle throws: the CLI then runs the full suite).
  const shown = execFileSync('git', ['show', `${base}:${file}`], { cwd: root, encoding: 'utf8' });
  const before = JSON.parse(shown);
  const after = JSON.parse(readFileSync(join(root, file), 'utf8'));
  const keys = changedKeys(before, after);
  // The mobile apps read the same bundles: a key only they read is known, and needs no e2e.
  const listed = ['ls-files', 'apps/staff-mobile', 'apps/family-mobile', 'packages/mobile-kit'];
  const mobile = execFileSync('git', listed, { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
  const read = (f) => [f, readFileSync(join(root, f), 'utf8')];
  const sources = new Map([...[...g.files].map(read), ...mobile.map(read)]);
  const { users, unknown } = keyUsers(keys, sources, (f) => MOBILE.test(f));
  if (unknown.length)
    return { reason: `${file}: no reader found for ${unknown.slice(0, 3).join(', ')}` };
  return { users: [...users], keys: keys.length };
}

/** A changed i18n bundle: the files reading a changed key, and the «every key» area. */
export function takeBundle(sel, f) {
  const r = bundleUsers({ root: sel.root, file: f, base: sel.base, graph: sel.g });
  const every = sel.map.areas[EVERY_KEY_AREA];
  if (r.reason) return r.reason;
  if (!every) return `no «${EVERY_KEY_AREA}» area for ${f}`;
  sel.starts.push(...r.users);
  for (const s of r.keys ? every.specs : []) sel.specs.add(s);
  return '';
}
