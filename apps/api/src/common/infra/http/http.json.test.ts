import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createHttp } from './http';
import { answering, brokenBody, caught, errno, failing, profileOf } from './http.fakes';

const schema = z.looseObject({ id: z.string() });

describe('http.json', () => {
  it('a 2xx parsed by the schema', async () => {
    const http = createHttp(
      profileOf({ fetch: answering(() => Response.json({ id: 'w1', x: 1 })) }),
    );
    expect(await http.json({ path: 'messages', schema })).toEqual({ id: 'w1', x: 1 });
  });

  it('a 2xx of the wrong shape → shape with its status and issues', async () => {
    const res = () => Response.json({ no: 1 }, { status: 201 });
    const http = createHttp(profileOf({ fetch: answering(res) }));
    const error = await caught(http.json({ path: 'm', schema }));
    expect(error.key).toBe('shape');
    expect(error.failure).toMatchObject({ kind: 'shape', status: 201, where: 'test GET /m' });
    expect(error.failure.kind === 'shape' && error.failure.issues.length).toBeGreaterThan(0);
  });

  it('a 2xx that is not JSON is parsed as null', async () => {
    const http = createHttp(profileOf({ fetch: answering(() => new Response('<html>')) }));
    expect(await http.json({ path: 'm', schema: z.null() })).toBeNull();
  });

  it('a non-2xx → status, the body parsed by errorBody, text capped at 300', async () => {
    const big = { error: { code: 131, pad: 'x'.repeat(400) } };
    const res = () => Response.json(big, { status: 400, headers: { 'retry-after': '7' } });
    const errorBody = z.looseObject({ error: z.looseObject({ code: z.number() }) });
    const http = createHttp(profileOf({ fetch: answering(res), errorBody }));
    const { key, failure } = await caught(http.json({ path: 'm', method: 'POST', schema }));
    expect(key).toBe('4xx');
    expect(failure).toMatchObject({ kind: 'status', status: 400, retryAfter: '7', body: big });
    expect(failure.kind === 'status' && failure.text.length).toBe(300);
    expect(failure.where).toBe('test POST /m');
  });

  it("errorBody 'omit' keeps neither body nor text", async () => {
    const res = () => Response.json({ phone: '+20…' }, { status: 500 });
    const http = createHttp(profileOf({ fetch: answering(res) }));
    const { failure } = await caught(http.json({ path: 'm', schema }));
    expect(failure).toMatchObject({
      kind: 'status',
      status: 500,
      body: null,
      text: '',
      retryAfter: null,
    });
  });

  it('an error body that misses the errorBody schema is null, its text kept', async () => {
    const res = () => new Response('Bad gateway', { status: 502 });
    const errorBody = z.object({ e: z.string() });
    const http = createHttp(profileOf({ fetch: answering(res), errorBody }));
    const { failure } = await caught(http.json({ path: 'm', schema }));
    expect(failure).toMatchObject({ body: null, text: 'Bad gateway' });
  });

  it('a connection that never left → network, reached false', async () => {
    const http = createHttp(profileOf({ fetch: failing(errno('ECONNREFUSED')) }));
    const { key, failure } = await caught(http.json({ path: 'm', schema }));
    expect([key, failure]).toEqual([
      'network',
      { kind: 'network', reached: false, where: 'test GET /m' },
    ]);
  });

  it('a reset before the headers → network, reached true', async () => {
    const http = createHttp(profileOf({ fetch: failing(errno('ECONNRESET')) }));
    expect((await caught(http.json({ path: 'm', schema }))).failure).toMatchObject({
      reached: true,
    });
  });

  it('a 2xx whose body read fails → network, reached true', async () => {
    const http = createHttp(profileOf({ fetch: answering(brokenBody) }));
    const { failure } = await caught(http.json({ path: 'm', schema }));
    expect(failure).toEqual({ kind: 'network', reached: true, where: 'test GET /m' });
  });
});
