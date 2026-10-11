import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// docs/12 §13.5: only these files (paths relative to apps/api/src) may call Meta or hold a client.
// Everything else goes through MessageDispatch (send), ReadReceipts (markRead) or InboundMedia
// (getMedia), so the per-line routing and the WA_ALLOWED_RECIPIENTS guard cannot be bypassed.

export const WHITELIST = new Set([
  'env.ts',
  'env.whatsapp.ts',
  'modules/inbox/read-receipts.ts',
  'modules/whatsapp/graph.ts',
  'modules/whatsapp/inbound-media.service.ts',
  'modules/whatsapp/lines.check.ts',
  'modules/whatsapp/message.dispatch.ts',
  'modules/whatsapp/template.registry.ts',
  'modules/whatsapp/whatsapp.client.ts',
  'modules/whatsapp/whatsapp.module.ts',
  'modules/whatsapp/whatsapp.types.ts',
]);

const METHODS = 'sendTemplate|sendText|sendDocument|markRead|getMedia|getTemplates|submitTemplate|uploadSample';

/** [label, pattern]: a call, a bracket call, a destructured method, a raw Graph base, a client. */
const META_CALLS: readonly (readonly [string, RegExp])[] = [
  ['client method', new RegExp(`\\.\\s*(${METHODS})\\b`)],
  ['bracket method', new RegExp(`\\[\\s*['"\`](${METHODS})['"\`]\\s*\\]`)],
  ['destructured method', new RegExp(`\\{[^}]*\\b(${METHODS})\\b[^}]*\\}\\s*=`)],
  ['graph helper', /\bgraph(Fetch|Json)\b/],
  ['WA_API_BASE', /\bWA_API_BASE\b/],
  ['graph.facebook.com', /graph\.facebook\.com/],
  ['client token', /\bWHATSAPP_(CLIENT|LINES)\b/],
  ['HttpWhatsappClient', /\bHttpWhatsappClient\b/],
];

/** What tsconfig.build.json leaves out of the build (tests and test helpers). */
const NOT_BUILT = [/\.test\.ts$/, /\.fakes\.ts$/, /(^|\/)test-app\.ts$/, /(^|\/)fake-db\.ts$/, /\.test-util\.ts$/];

/** Comments may mention Meta (doc links); a `//` inside `https://…` is not a comment. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

/** The labels of the Meta calls found in the CODE of one file. */
export function metaCallsIn(source: string): string[] {
  const code = stripComments(source);
  return META_CALLS.filter(([, re]) => re.test(code)).map(([label]) => label);
}

/** `path: label` for every non-whitelisted built source that calls Meta (path relative to src, `/`). */
export function offenders(files: readonly { path: string; source: string }[]): string[] {
  return files
    .map((f) => ({ ...f, path: f.path.replace(/\\/g, '/') }))
    .filter((f) => !WHITELIST.has(f.path) && !NOT_BUILT.some((re) => re.test(f.path)))
    .flatMap((f) => metaCallsIn(f.source).map((label) => `${f.path}: ${label}`));
}

/** Every .ts file under dir (absolute paths). */
export function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return e.name.endsWith('.ts') ? [path] : [];
  });
}
