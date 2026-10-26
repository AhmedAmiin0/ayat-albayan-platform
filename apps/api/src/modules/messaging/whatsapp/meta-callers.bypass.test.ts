import { describe, expect, it } from 'vitest';
import { offenders } from './meta-callers.test-util';

// Review A, A1: each input below passed the old basename + string-needle guard.

const at = (path: string, source: string): string[] => offenders([{ path, source }]);

describe('Meta callers guard: bypasses are caught', () => {
  it('a whitelisted basename in another folder is not whitelisted', () => {
    const source = 'await this.client.sendText({ to, text });';
    expect(at('modules/leads/message.dispatch.ts', source)).toEqual(['modules/leads/message.dispatch.ts: client method']);
    expect(at('modules/messaging/whatsapp/sender/message.dispatch.ts', source)).toEqual([]);
  });

  it('bracket access', () => {
    expect(at('modules/x/x.ts', "await client['sendText']({ to, text });")).toEqual(['modules/x/x.ts: bracket method']);
    expect(at('modules/x/x.ts', 'await client["markRead"](id);')).toEqual(['modules/x/x.ts: bracket method']);
  });

  it('whitespace before the parenthesis or after the dot', () => {
    expect(at('modules/x/x.ts', 'await client.sendText (x);')).toEqual(['modules/x/x.ts: client method']);
    expect(at('modules/x/x.ts', 'await client\n  .sendDocument(x);')).toEqual(['modules/x/x.ts: client method']);
  });

  it('a destructured method', () => {
    const source = 'const { sendText } = lines.chat;\nawait sendText.call(lines.chat, x);';
    expect(at('modules/x/x.ts', source)).toEqual(['modules/x/x.ts: destructured method']);
  });

  it('a raw fetch over WA_API_BASE', () => {
    const source = 'await fetch(`${env.WA_API_BASE}/v21.0/123/messages`, { method: "POST" });';
    expect(at('modules/x/x.ts', source)).toEqual(['modules/x/x.ts: WA_API_BASE']);
  });

  it('template methods and the graph helpers', () => {
    for (const m of ['getTemplates', 'submitTemplate', 'uploadSample', 'getMedia']) {
      expect(at('modules/x/x.ts', `await this.client.${m}(x);`)).toEqual(['modules/x/x.ts: client method']);
    }
    expect(at('modules/x/x.ts', 'await graphJson(conn, { path });')).toEqual(['modules/x/x.ts: graph helper']);
  });

  it('a client injected or constructed outside the whitelist', () => {
    const inject = 'constructor(@Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines) {}';
    expect(at('modules/x/x.ts', inject)).toEqual(['modules/x/x.ts: client token']);
    expect(at('modules/x/x.ts', '@Inject(WHATSAPP_CLIENT) c: WhatsappClient')).toEqual(['modules/x/x.ts: client token']);
    expect(at('modules/x/x.ts', 'const c = new HttpWhatsappClient(env, {});')).toEqual(['modules/x/x.ts: HttpWhatsappClient']);
  });

  it('names that only contain a method word are not calls', () => {
    const source = 'await this.queries.markInboundRead(phone); const sendTextLabel = 1;';
    expect(at('modules/x/x.ts', source)).toEqual([]);
  });

  it('Windows separators are normalised before the whitelist lookup', () => {
    expect(at('modules\\messaging\\whatsapp\\drivers\\meta\\graph.ts', 'export async function graphFetch() {}')).toEqual([]);
  });
});
