import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINK_TEMPLATES } from './sales-threads';

// docs/44 K1: the realtime push hides a link template's id from every staff reader through the SQL
// twin public.inbox_link_templates() (migration 20261107000200 or a later one). No database runs
// in unit tests: the latest definition is read from the migrations and must list LINK_TEMPLATES.
const dir = join(__dirname, '../../../../../../../packages/db/supabase/migrations');
const DEFINES = 'function public.inbox_link_templates()';

/** The newest migration defining the twin, without its comments. */
function latestTwin(): string {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const sources = files.map((f) => readFileSync(join(dir, f), 'utf8'));
  const code = sources.map((s) => s.split('\n').filter((l) => !l.trimStart().startsWith('--')));
  const defining = code.map((lines) => lines.join('\n')).filter((s) => s.includes(DEFINES));
  return defining.at(-1) ?? '';
}

/** The keys in the twin's `array[…]` literal. */
function twinKeys(sql: string): string[] {
  const body = sql.slice(sql.indexOf(DEFINES));
  const literal = /array\[([^\]]*)\]/.exec(body)?.[1] ?? '';
  return [...literal.matchAll(/'([^']+)'/g)].flatMap((m) => (m[1] ? [m[1]] : []));
}

describe('inbox_link_templates(): the SQL twin of LINK_TEMPLATES', () => {
  it('lists exactly the TypeScript link templates', () => {
    const keys = twinKeys(latestTwin());
    expect(keys.length).toBeGreaterThan(0);
    expect([...keys].sort()).toEqual([...LINK_TEMPLATES].sort());
  });

  it('is used by the row rule of the live push', () => {
    const sql = latestTwin();
    expect(sql).toContain("p ->> 'template_key' = any (public.inbox_link_templates())");
    expect(sql).toContain("p ->> 'hidden_at' is null");
    expect(sql).toContain("public.message_is_reaction(p -> 'interactive_payload')");
  });
});
