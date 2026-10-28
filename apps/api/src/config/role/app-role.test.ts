import { describe, expect, it } from 'vitest';
import { appRole, peerUrls, runsJobs, servesPublicHttp, trustProxyHops, workerUrl } from './app-role';

describe('appRole (APP_ROLE)', () => {
  it('unset or blank is `all`: local dev and tests behave as before', () => {
    expect(appRole({})).toBe('all');
    expect(appRole({ APP_ROLE: '  ' })).toBe('all');
  });

  it('reads api, worker and all', () => {
    expect(['api', 'worker', 'all'].map((r) => appRole({ APP_ROLE: r }))).toEqual([
      'api',
      'worker',
      'all',
    ]);
    expect(appRole({ APP_ROLE: ' worker ' })).toBe('worker');
  });

  it('an unknown role stops the boot', () => {
    expect(() => appRole({ APP_ROLE: 'Worker' })).toThrow('APP_ROLE must be api, worker or all');
    expect(() => appRole({ APP_ROLE: 'jobs' })).toThrow('APP_ROLE');
  });

  it('api runs no jobs and serves the public routes; worker the opposite; all does both', () => {
    expect([runsJobs('api'), runsJobs('worker'), runsJobs('all')]).toEqual([false, true, true]);
    expect([servesPublicHttp('api'), servesPublicHttp('worker'), servesPublicHttp('all')]).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe('trustProxyHops (TRUST_PROXY_HOPS)', () => {
  it('defaults to one hop (the host Caddy), as main.ts trusted before', () => {
    expect(trustProxyHops({})).toBe(1);
    expect(trustProxyHops({ TRUST_PROXY_HOPS: '' })).toBe(1);
  });

  it('2 behind the host Caddy + the staging load balancer', () => {
    expect(trustProxyHops({ TRUST_PROXY_HOPS: '2' })).toBe(2);
  });

  it('refuses anything that is not a small whole number', () => {
    for (const bad of ['-1', '1.5', 'true', '6'])
      expect(() => trustProxyHops({ TRUST_PROXY_HOPS: bad })).toThrow('TRUST_PROXY_HOPS');
  });
});

describe('workerUrl (WORKER_URL)', () => {
  it('trims the trailing slash; blank is none', () => {
    expect(workerUrl({ WORKER_URL: 'http://ayat-worker:3000/' })).toBe('http://ayat-worker:3000');
    expect(workerUrl({ WORKER_URL: ' ' })).toBeNull();
    expect(workerUrl({})).toBeNull();
  });
});

describe('peerUrls (PEER_URLS)', () => {
  it('splits on commas, trims each and drops blanks; unset is none', () => {
    expect(peerUrls({ PEER_URLS: ' http://ayat-api-b:3000/ , ,http://ayat-api-c:3000' })).toEqual([
      'http://ayat-api-b:3000',
      'http://ayat-api-c:3000',
    ]);
    expect(peerUrls({})).toEqual([]);
  });
});
