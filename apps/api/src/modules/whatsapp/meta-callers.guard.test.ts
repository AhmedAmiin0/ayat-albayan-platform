import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// docs/12 §13.5: only these files may call Meta. Everything else goes through MessageDispatch
// (send), ReadReceipts (markRead) or InboundMedia (getMedia), so the per-line routing and the
// WA_ALLOWED_RECIPIENTS guard cannot be bypassed.

const WHITELIST = new Set([
  'message.dispatch.ts',
  'read-receipts.ts',
  'inbound-media.service.ts',
  'whatsapp.client.ts',
  'graph.ts',
  'lines.check.ts',
  'template.registry.ts',
]);

const META_CALLS = ['.sendTemplate(', '.sendText(', '.sendDocument(', '.markRead(', '.getMedia(', 'graph.facebook.com', 'graphFetch(', 'graphJson('];

/** What tsconfig.build.json leaves out of the build (tests and test helpers). */
const NOT_BUILT = [/\.test\.ts$/, /\.fakes\.ts$/, /(^|\/)test-app\.ts$/, /(^|\/)fake-db\.ts$/, /\.test-util\.ts$/];

/** Comments may mention Meta (doc links); a `//` inside `https://…` is not a comment. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/** The Meta calls found in the CODE of one file. */
export function metaCallsIn(source: string): string[] {
  const code = stripComments(source);
  return META_CALLS.filter((needle) => code.includes(needle));
}

/** `file: needle` for every non-whitelisted built source that calls Meta. */
export function offenders(files: readonly { path: string; source: string }[]): string[] {
  return files
    .filter((f) => !WHITELIST.has(basename(f.path)) && !NOT_BUILT.some((re) => re.test(f.path)))
    .flatMap((f) => metaCallsIn(f.source).map((needle) => `${f.path}: ${needle}`));
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return e.name.endsWith('.ts') ? [path] : [];
  });
}

/** apps/api/src (not import.meta.url: TS1470 under NodeNext + commonjs; not process.cwd()). */
const SRC = join(__dirname, '../..');

describe('Meta callers guard (docs/12 §13.5)', () => {
  it('scans the real apps/api/src tree', () => {
    const files = sources(SRC);
    expect(files.some((p) => p.endsWith(join('modules', 'whatsapp', 'message.dispatch.ts')))).toBe(true);
    expect(files.length).toBeGreaterThan(50);
  });

  it('no built source outside the whitelist calls Meta', () => {
    const files = sources(SRC).map((p) => ({ path: relative(SRC, p), source: readFileSync(p, 'utf8') }));
    expect(offenders(files)).toEqual([]);
  });

  it('a comment-only mention passes', () => {
    const source = [
      '/** Docs: https://graph.facebook.com/v21.0 and client.sendText( in a block. */',
      '// lines.notifications.sendTemplate( is called by MessageDispatch',
      "const base = 'x'; // see graph.facebook.com",
      '/*',
      ' * graphJson( across lines',
      ' */',
    ].join('\n');
    expect(metaCallsIn(source)).toEqual([]);
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual([]);
  });

  it('a code mention in a non-whitelisted file fails', () => {
    const source = "const u = 'https://graph.facebook.com/x';";
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual(['modules/x/x.service.ts: graph.facebook.com']);
    const call = 'await this.client.sendText({ to, text });';
    expect(offenders([{ path: 'modules/inbox/thread-send.service.ts', source: call }])).toEqual([
      'modules/inbox/thread-send.service.ts: .sendText(',
    ]);
  });

  it('a `//` inside a URL string is not a comment', () => {
    expect(stripComments("const u = 'https://graph.facebook.com/x';")).toContain('graph.facebook.com');
  });

  it('whitelisted files and test-only files may call Meta', () => {
    const source = 'await this.lines.notifications.sendTemplate(x);';
    const paths = [
      'modules/whatsapp/message.dispatch.ts',
      'modules/inbox/read-receipts.ts',
      'modules/whatsapp/message.dispatch.test.ts',
      'modules/whatsapp/whatsapp.fakes.ts',
      'modules/whatsapp/test-app.ts',
      'modules/guardians/fake-db.ts',
      'modules/x/x.test-util.ts',
    ];
    expect(offenders(paths.map((path) => ({ path, source })))).toEqual([]);
  });
});
