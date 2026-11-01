import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { FetchLike } from './failure';
import { createHttp } from './http';
import { answering, brokenBody, failing, hanging, profileOf } from './http.fakes';

// docs/36 §5: no failure carries the URL, a header value or the request body.

const SECRET = 'sentinel-secret-4711';
const leaky = new TypeError(`fetch failed https://peer.invalid/?k=${SECRET}`, {
  cause: { code: 'ECONNRESET' },
});

const transports: [string, FetchLike][] = [
  ['network', failing(leaky)],
  ['status', answering(() => new Response('nope', { status: 401 }))],
  ['shape', answering(() => Response.json({}))],
  ['broken body', answering(brokenBody)],
  ['timeout', hanging],
];

describe('no secret in a failure', () => {
  it.each(transports)('%s', async (_name, fetch) => {
    const http = createHttp(profileOf({ fetch, timeoutMs: 20 }));
    const error: unknown = await http
      .json({
        path: `https://peer.invalid/a?token=${SECRET}`,
        method: 'POST',
        query: { key: SECRET },
        headers: { authorization: `Bearer ${SECRET}` },
        json: { secret: SECRET },
        schema: z.object({ id: z.string() }),
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    const text = [String(error), (error as Error).message, JSON.stringify(error)].join(' ');
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('peer.invalid');
  });
});
