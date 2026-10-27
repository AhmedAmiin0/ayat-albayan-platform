// UI strings (packages/shared/i18n/ar.json, en.json): a changed bundle is followed key by key to the files
// that read those keys, which then go through the import graph like any changed file.
// A file reads key a.b.c when it names the whole path (t.a.b.c, ar.a.b.c, 'a.b.c', a destructured
// a.b.c) or takes a parent object whole (t.a.b passed on, t.a.b[x], Object.keys(t.a)). A key nobody
// is found to read = unknown (a computed key): the caller runs the full suite.
export const BUNDLES = /^packages\/shared\/i18n\/(ar|en)\.json$/;

/** Every key path (a.b.c) whose value differs between two bundles (added, removed or changed). */
export function changedKeys(before, after) {
  const flat = (tree, prefix = '', out = new Map()) => {
    for (const [k, v] of Object.entries(tree ?? {})) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, path, out);
      else out.set(path, JSON.stringify(v));
    }
    return out;
  };
  const a = flat(before);
  const b = flat(after);
  return [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k)).sort();
}

/** Names the bundles go by: t (web), ar / en (api, e2e), arBundle / enBundle. */
const ROOTS = 't|ar|en|arBundle|enBundle';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One regex per key: the full path, a quoted or template-prefix string, or a parent taken whole. */
export function keyPattern(key) {
  const parts = key.split('.');
  const alts = [`(?<![\\w$])${esc(key)}(?![\\w$])`, `['"\`]${esc(key)}['"\`]`];
  for (let i = parts.length - 1; i >= 1; i--) {
    const parent = esc(parts.slice(0, i).join('.'));
    const whole = `${parent}(?![\\w$]|\\.[\\w$])`;
    alts.push(`\`${parent}\\.\\$\\{`);
    // A top-level object only off a bundle (t.inbox); `counts.inbox` is not one.
    if (i === 1) alts.push(`(?<![\\w$])(?:${ROOTS})\\.${whole}`);
    else alts.push(`\\.${whole}`, `(?<![\\w$.])${whole}`);
  }
  return new RegExp(alts.join('|'));
}

/**
 * { users, unknown }: the files (from `sources`, a Map file -> text) that read any changed key, and
 * the keys no file reads. `ignore(file)` drops hits in files e2e never runs (the mobile app).
 */
export function keyUsers(keys, sources, ignore = () => false) {
  const users = new Set();
  const unknown = [];
  for (const key of keys) {
    const re = keyPattern(key);
    let found = false;
    for (const [file, text] of sources) {
      if (!re.test(text)) continue;
      found = true;
      if (!ignore(file)) users.add(file);
    }
    if (!found) unknown.push(key);
  }
  return { users, unknown };
}
