import { createHmac } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createStub, type StubOptions } from './stub.ts';

const servers: Server[] = [];

async function start(opts: StubOptions = {}) {
  const stub = createStub(opts);
  const server = createServer((req, res) => void stub.handle(req, res));
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, r));
  return { stub, url: `http://localhost:${(server.address() as AddressInfo).port}` };
}

afterEach(() => servers.splice(0).forEach((s) => s.close()));

const post = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

describe('wa-stub', () => {
  it('accepts a registered template and logs it', async () => {
    const { url, stub } = await start();
    const res = await post(`${url}/v20.0/PHONE/messages`, {
      messaging_product: 'whatsapp', to: '966598917071', type: 'template',
      template: { name: 'lesson_reminder_24h', language: { code: 'ar' } },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { messages: { id: string }[] };
    expect(json.messages[0]?.id).toMatch(/^wamid\./);
    expect(stub.sent).toHaveLength(1);
    expect(stub.sent[0]).toMatchObject({ to: '966598917071', template: 'lesson_reminder_24h' });
  });

  it('reproduces error 132001 for unknown templates (issue C1)', async () => {
    const { url, stub } = await start();
    const res = await post(`${url}/v20.0/PHONE/messages`, { type: 'template', template: { name: 'lesson_reminder_v2' } });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: { code: number } }).error.code).toBe(132001);
    expect(stub.sent).toHaveLength(0);
  });

  it('accepts session text messages', async () => {
    const { url } = await start();
    const res = await post(`${url}/v20.0/PHONE/messages`, { to: '966500000001', type: 'text', text: { body: 'أهلاً' } });
    expect(res.status).toBe(200);
  });

  it('lists templates and exposes/clears the sent log', async () => {
    const { url } = await start({ templates: ['report_ready'] });
    const list = (await (await fetch(`${url}/v20.0/WABA/message_templates`)).json()) as { data: { name: string }[] };
    expect(list.data.map((t) => t.name)).toEqual(['report_ready']);
    await post(`${url}/v20.0/PHONE/messages`, { type: 'template', template: { name: 'report_ready' } });
    expect(((await (await fetch(`${url}/__stub/messages`)).json()) as unknown[]).length).toBe(1);
    await fetch(`${url}/__stub/messages`, { method: 'DELETE' });
    expect(((await (await fetch(`${url}/__stub/messages`)).json()) as unknown[]).length).toBe(0);
  });

  it('forwards simulated inbound messages with a valid signature', async () => {
    let received: { sig: string | undefined; body: string } | undefined;
    const hook = createServer((req, res) => {
      let body = '';
      req.on('data', (c: Buffer) => (body += c.toString()));
      req.on('end', () => {
        received = { sig: req.headers['x-hub-signature-256'] as string | undefined, body };
        res.writeHead(200).end();
      });
    });
    servers.push(hook);
    await new Promise<void>((r) => hook.listen(0, r));
    const webhookUrl = `http://localhost:${(hook.address() as AddressInfo).port}/webhooks/whatsapp`;
    const { url } = await start({ webhookUrl, appSecret: 's3cret' });

    const res = await post(`${url}/__stub/inbound`, { from: '966598917071', text: 'السلام عليكم' });
    expect(res.status).toBe(200);
    const expected = createHmac('sha256', 's3cret').update(received?.body ?? '').digest('hex');
    expect(received?.sig).toBe(`sha256=${expected}`);
    expect(received?.body).toContain('السلام عليكم');
  });
});
