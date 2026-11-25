// Test helper: a google-stub on a random port, started before and closed after every test.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach } from 'vitest';
import { z } from 'zod';
import { createStub } from './stub.ts';

export const AUTH = { authorization: 'Bearer stub-access-token' };
export const idOnly = z.object({ id: z.string() });
export const fileList = z.object({ files: z.array(idOnly) });

/** The answer's JSON, parsed with `schema`. */
export const read = async <S extends z.ZodType>(res: Response | Promise<Response>, schema: S) =>
  schema.parse(await (await res).json());

/** A bearer POST with a JSON body. */
export const json = (body: unknown) => ({
  method: 'POST',
  headers: { ...AUTH, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/** Starts a fresh stub around each test; `base()` is its URL. */
export function useStub(): { base: () => string } {
  let server: Server | undefined;
  let url = '';
  beforeEach(async () => {
    const stub = createStub();
    server = createServer((req, res) => void stub.handle(req, res));
    await new Promise<void>((r) => server?.listen(0, r));
    url = `http://localhost:${(server.address() as AddressInfo).port}`;
  });
  afterEach(() => server?.close());
  return { base: () => url };
}
