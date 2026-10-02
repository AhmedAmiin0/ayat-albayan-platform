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

export function post(url: string, body: unknown, headers: Record<string, string> = AUTH) {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
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
