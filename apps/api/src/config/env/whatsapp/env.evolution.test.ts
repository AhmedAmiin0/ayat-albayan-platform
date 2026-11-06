import { evolutionConfigSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { evolutionHookOf } from './env.evolution';

// Review fix 1: the webhook URL (which receives the instance token) is built by the server from
// an origin of ours and the CURRENT instance name; an admin never types a host.

const internal = evolutionConfigSchema.parse({});
const pub = evolutionConfigSchema.parse({ webhook: { origin: 'public' } });

describe('evolutionHookOf', () => {
  it('internal: the stack load balancer on the docker network', () => {
    expect(evolutionHookOf(internal, 'secondary-1', {}))
      .toBe('http://ayat-lb:8080/webhooks/evolution/secondary-1');
  });

  it('public: API_PUBLIC_URL as an https origin only', () => {
    const env = { API_PUBLIC_URL: 'https://api.ayatalbayan.com/' };
    expect(evolutionHookOf(pub, 'sec 1', env)).toBe('https://api.ayatalbayan.com/webhooks/evolution/sec%201');
    expect(evolutionHookOf(pub, 'x', {})).toBeNull();
    expect(evolutionHookOf(pub, 'x', { API_PUBLIC_URL: 'http://api.example.test' })).toBeNull();
    expect(evolutionHookOf(pub, 'x', { API_PUBLIC_URL: 'https://api.example.test/steal' })).toBeNull();
  });
});
