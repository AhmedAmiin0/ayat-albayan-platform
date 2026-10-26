import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// docs/12 §13.5: only these files (paths relative to apps/api/src) may call Meta or hold a client.
// Everything else goes through MessageDispatch (send), ReadReceipts (markRead) or InboundMedia
// (getMedia), so the per-line routing and the WA_ALLOWED_RECIPIENTS guard cannot be bypassed.

const WHITELIST = new Set([
  'config/env/env.ts',
  'config/env/env.gaps.ts',
  'config/env/whatsapp/env.kapso.ts',
  'config/env/whatsapp/env.whatsapp.ts',
  'modules/messaging/inbox/reads/read-receipts.ts',
  'modules/messaging/whatsapp/drivers/meta/graph.ts',
  'modules/messaging/whatsapp/messages/inbound-media.service.ts',
  'modules/messaging/whatsapp/drivers/kapso/kapso.ts',
  // Kapso's own conversation record (owner 2026-10-26): its Platform API, beside the Meta proxy.
  'modules/messaging/whatsapp/drivers/kapso/kapso-conversations.ts',
  'modules/messaging/whatsapp/lines/lines.check.ts',
  'modules/messaging/whatsapp/sender/message.dispatch.ts',
  'modules/messaging/whatsapp/templates/catalog/template.registry.ts',
  // The registry's own parts (150-line cap): one line's sync (read-only list), the explicit submit.
  'modules/messaging/whatsapp/templates/sync/template-line-sync.ts',
  'modules/messaging/whatsapp/templates/sync/template-submit.ts',
  // One number's template sync (docs/23c decision 4): a read-only list from that number's own client.
  'modules/messaging/whatsapp/templates/sync/template-number-sync.ts',
  'modules/messaging/whatsapp/templates/sync/template-numbers.service.ts',
  'modules/messaging/whatsapp/live-client.ts',
  // Routing per number (docs/23c): one number's own config and client, used only by MessageDispatch.
  'modules/messaging/numbers/config/numbers.env.ts',
  'modules/messaging/whatsapp/numbers/number-clients.ts',
  'modules/messaging/whatsapp/whatsapp.client.ts',
  // The crm driver (docs/19): the one client factory and the CRM's REST client, used only through the line clients.
  'modules/messaging/whatsapp/client-factory.ts',
  'modules/messaging/whatsapp/drivers/crm/crm.client.ts',
  'modules/messaging/whatsapp/drivers/crm/crm-http.ts',
  'modules/messaging/whatsapp/whatsapp.module.ts',
  // WhatsApp voice calls (docs/28): the one Kapso calling client, one request per method, never a retry.
  'modules/messaging/calls/kapso/kapso-calls.ts',
  'modules/messaging/whatsapp/whatsapp.types.ts',
  // Kapso's message history (owner report 2026-10-26): read-only GETs that store messages sent outside the app.
  'modules/messaging/webhook/external/kapso-history.ts',
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
  ['KAPSO_API_BASE', /\bKAPSO_API_BASE\b/],
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

/**
 * Hosted API hosts no built source may name in code, whitelisted files included (docs/19): the
 * base always comes from config (WA_API_BASE / KAPSO_API_BASE), so local and e2e hit tools/wa-stub.
 */
const HOSTS: readonly (readonly [string, RegExp])[] = [['api.kapso.ai', /api\.kapso\.ai/]];

/** `path: label` for every non-whitelisted built source that calls Meta (path relative to src, `/`). */
export function offenders(files: readonly { path: string; source: string }[]): string[] {
  const built = files.map((f) => ({ ...f, path: f.path.replace(/\\/g, '/') })).filter((f) => !NOT_BUILT.some((re) => re.test(f.path)));
  const calls = built
    .filter((f) => !WHITELIST.has(f.path))
    .flatMap((f) => metaCallsIn(f.source).map((label) => `${f.path}: ${label}`));
  const hosts = built.flatMap((f) => {
    const code = stripComments(f.source);
    return HOSTS.filter(([, re]) => re.test(code)).map(([label]) => `${f.path}: ${label}`);
  });
  return [...calls, ...hosts];
}

/** Every .ts file under dir (absolute paths). */
export function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return e.name.endsWith('.ts') ? [path] : [];
  });
}
