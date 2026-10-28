import { FastifyAdapter } from '@nestjs/platform-fastify';
import { describe, expect, it } from 'vitest';
import { trustProxyHops } from '../../../config/role/app-role';

/** req.ip as the API sees it, behind `hops` trusted proxies (main.ts passes trustProxyHops() to Fastify). */
async function ipSeen(hops: number, request: { remote: string; xff?: string }): Promise<string> {
  const app = new FastifyAdapter({ trustProxy: hops }).getInstance();
  app.get('/ip', (req) => ({ ip: req.ip }));
  const res = await app.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress: request.remote,
    headers: request.xff ? { 'x-forwarded-for': request.xff } : {},
  });
  await app.close();
  return res.json<{ ip: string }>().ip;
}

describe('trustProxy hop count', () => {
  // The host Caddy replaces a visitor's X-Forwarded-For with the visitor; ayat-lb appends the host Caddy's address.
  const viaLb = { remote: '172.18.0.5', xff: '203.0.113.9, 172.18.0.1' };
  const spoofed = { remote: '172.18.0.5', xff: '6.6.6.6, 203.0.113.9, 172.18.0.1' };

  it('2 hops (host Caddy + ayat-lb): the real visitor, and a forged header cannot pick another IP', async () => {
    expect(await ipSeen(trustProxyHops({ TRUST_PROXY_HOPS: '2' }), viaLb)).toBe('203.0.113.9');
    expect(await ipSeen(2, spoofed)).toBe('203.0.113.9');
  });

  it('1 hop behind the load balancer would see the host Caddy instead: why staging sets 2', async () => {
    expect(await ipSeen(trustProxyHops({}), viaLb)).toBe('172.18.0.1');
  });

  it('1 hop straight behind the host Caddy (one process, as before) is still the visitor', async () => {
    expect(await ipSeen(1, { remote: '127.0.0.1', xff: '203.0.113.9' })).toBe('203.0.113.9');
  });
});
