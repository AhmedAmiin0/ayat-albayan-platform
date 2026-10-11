// Test helper: a stub on a random port plus a fake API webhook that records what it receives.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createStub, type StubOptions } from './stub.ts';

const servers: Server[] = [];

export function closeAll(): void {
  servers.splice(0).forEach((s) => s.close());
}

async function listen(server: Server): Promise<string> {
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, r));
  return `http://localhost:${(server.address() as AddressInfo).port}`;
}

export async function startStub(opts: StubOptions = {}) {
  const stub = createStub(opts);
  const url = await listen(createServer((req, res) => void stub.handle(req, res)));
  return { stub, url };
}

export interface Received {
  sig: string | undefined;
  body: string;
}

/** A fake API: records every webhook POST and answers 200. */
export async function startHook() {
  const received: Received[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => {
      received.push({ sig: req.headers['x-hub-signature-256'] as string | undefined, body });
      res.writeHead(200).end();
    });
  });
  const url = `${await listen(server)}/webhooks/whatsapp`;
  return { url, received };
}

export const AUTH = { authorization: 'Bearer test-token' };

/** Two lines with DISTINCT ids, tokens and secrets (docs/12 §13.12). */
export const TWO_LINES = {
  phoneNumberId: 'PN-N',
  wabaId: 'WABA-N',
  appId: 'APP-N',
  accessToken: 'notif-token',
  appSecret: 'notif-secret',
  chat: { phoneNumberId: 'PN-C', wabaId: 'WABA-C', appId: 'APP-C', accessToken: 'chat-token', appSecret: 'chat-secret' },
} satisfies StubOptions;

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

export function post(url: string, body: unknown, headers: Record<string, string> = AUTH) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/** Step 1 of a resumable upload: the session id (`upload:…?sig=…`) or the raw response. */
export function startUpload(url: string, query: Record<string, string>, headers: Record<string, string> = AUTH) {
  return fetch(`${url}/v21.0/APP/uploads?${new URLSearchParams(query)}`, { method: 'POST', headers });
}

/** Both steps for `bytes` as a PDF: Meta's handle for example.header_handle. */
export async function uploadPdf(url: string, bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const query = { file_name: 'sample.pdf', file_length: String(bytes.length), file_type: 'application/pdf' };
  const { id } = (await (await startUpload(url, query)).json()) as { id: string };
  const headers = { authorization: 'OAuth test-token', file_offset: '0' };
  const res = await fetch(`${url}/v21.0/${id}`, { method: 'POST', headers, body: bytes });
  return ((await res.json()) as { h: string }).h;
}

/** A template send with `n` body parameters. */
export function templateBody(name: string, n: number, to = '966598917071') {
  const parameters = Array.from({ length: n }, (_, i) => ({ type: 'text', text: `p${i + 1}` }));
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: { name, language: { code: 'ar' }, components: [{ type: 'body', parameters }] },
  };
}
