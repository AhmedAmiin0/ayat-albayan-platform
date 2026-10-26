import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { metaCallsIn, offenders, sources, stripComments } from './meta-callers.test-util';

/** apps/api/src (not import.meta.url: TS1470 under NodeNext + commonjs; not process.cwd()). */
const SRC = join(__dirname, '../../..');

describe('Meta callers guard (docs/12 §13.5)', () => {
  it('scans the real apps/api/src tree', () => {
    const files = sources(SRC);
    expect(files.some((p) => p.endsWith(join('modules', 'messaging/whatsapp', 'sender/message.dispatch.ts')))).toBe(true);
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
      "const base = 'x'; // see graph.facebook.com and WA_API_BASE",
      '/*',
      ' * graphJson( across lines, @Inject(WHATSAPP_LINES)',
      ' */',
    ].join('\n');
    expect(metaCallsIn(source)).toEqual([]);
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual([]);
  });

  it('a code mention in a non-whitelisted file fails', () => {
    const source = "const u = 'https://graph.facebook.com/x';";
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual(['modules/x/x.service.ts: graph.facebook.com']);
    const call = 'await this.client.sendText({ to, text });';
    expect(offenders([{ path: 'modules/messaging/inbox/thread-send.service.ts', source: call }])).toEqual([
      'modules/messaging/inbox/thread-send.service.ts: client method',
    ]);
  });

  it('a `//` inside a URL string is not a comment', () => {
    expect(stripComments("const u = 'https://graph.facebook.com/x';")).toContain('graph.facebook.com');
  });

  it('whitelisted files and test-only files may call Meta', () => {
    const source = 'await this.lines.notifications.sendTemplate(x);';
    const paths = [
      'modules/messaging/whatsapp/sender/message.dispatch.ts',
      'modules/messaging/inbox/reads/read-receipts.ts',
      'modules/messaging/whatsapp/sender/message.dispatch.test.ts',
      'modules/messaging/whatsapp/whatsapp.fakes.ts',
      'modules/messaging/whatsapp/test-app.ts',
      'modules/people/guardians/fake-db.ts',
      'modules/x/x.test-util.ts',
    ];
    expect(offenders(paths.map((path) => ({ path, source })))).toEqual([]);
  });
});
