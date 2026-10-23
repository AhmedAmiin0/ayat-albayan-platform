// Pure helpers over migration text (used by the settings tests that pin SQL ↔ registry; docs/26 §2b):
// which live SQL objects read public.settings, and which keys they name. No I/O here.

/** One live SQL object (function or view) and its body, as the last migration that defines it left it. */
export interface SqlObject {
  name: string;
  body: string;
}

const FUNC_RE = /create\s+(?:or\s+replace\s+)?function\s+([\w.]+)\s*\([\s\S]*?\$(\w*)\$([\s\S]*?)\$\2\$/gi;
const VIEW_RE = /create\s+(?:or\s+replace\s+)?view\s+([\w.]+)([\s\S]*?);/gi;
const DROP_RE = /drop\s+(?:function|view)\s+(?:if\s+exists\s+)?([\w.]+)/gi;

const stripComments = (sql: string): string => sql.replace(/--[^\n]*/g, '');

/** Live definitions: migrations in filename order; a later `create or replace` wins, a `drop` removes. */
export function liveSqlObjects(migrations: Readonly<Record<string, string>>): Map<string, SqlObject> {
  const live = new Map<string, SqlObject>();
  for (const file of Object.keys(migrations).sort()) {
    const sql = stripComments(migrations[file] ?? '');
    const events: { at: number; apply: () => void }[] = [];
    for (const m of sql.matchAll(FUNC_RE)) {
      const name = m[1] ?? '';
      events.push({ at: m.index, apply: () => live.set(name, { name, body: m[3] ?? '' }) });
    }
    for (const m of sql.matchAll(VIEW_RE)) {
      const name = m[1] ?? '';
      events.push({ at: m.index, apply: () => live.set(name, { name, body: m[2] ?? '' }) });
    }
    for (const m of sql.matchAll(DROP_RE)) events.push({ at: m.index, apply: () => live.delete(m[1] ?? '') });
    for (const e of events.sort((a, b) => a.at - b.at)) e.apply();
  }
  return live;
}

/** Keys a body names next to public.settings: `key = 'k'` (any alias) and `key in ('a', 'b')`. */
export function settingsKeysOf(body: string): string[] {
  if (!/public\.settings\b/.test(body)) return [];
  const keys = [...body.matchAll(/\b(?:\w+\.)?key\s*=\s*'([a-z0-9_]+)'/g)].map((m) => m[1] ?? '');
  for (const m of body.matchAll(/\b(?:\w+\.)?key\s+in\s*\(([^)]*)\)/g)) {
    keys.push(...[...(m[1] ?? '').matchAll(/'([a-z0-9_]+)'/g)].map((k) => k[1] ?? ''));
  }
  return [...new Set(keys)].sort();
}

/** Every live object that reads public.settings → the keys it names. */
export function sqlSettingsReaders(migrations: Readonly<Record<string, string>>): Map<string, string[]> {
  const readers = new Map<string, string[]>();
  for (const obj of liveSqlObjects(migrations).values()) {
    const keys = settingsKeysOf(obj.body);
    if (keys.length > 0) readers.set(obj.name, keys);
  }
  return readers;
}
