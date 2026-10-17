import { describe, expect, it } from 'vitest';
import { offenders } from './meta-callers.test-util';

// docs/19: Kapso's host is never hardcoded in the API; its base comes from KAPSO_API_BASE only.

const HOST = ['api', 'kapso', 'ai'].join('.');

describe('Meta callers guard: the Kapso host', () => {
  it('a literal Kapso host fails in any built file, whitelisted ones included', () => {
    const source = `const base = 'https://${HOST}/meta/whatsapp';`;
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual([`modules/x/x.service.ts: ${HOST}`]);
    expect(offenders([{ path: 'modules/whatsapp/kapso.ts', source }])).toEqual([`modules/whatsapp/kapso.ts: ${HOST}`]);
    expect(offenders([{ path: 'env.kapso.ts', source }])).toEqual([`env.kapso.ts: ${HOST}`]);
  });

  it('a comment mention and a test file pass', () => {
    const comment = `// Kapso's proxy lives at https://${HOST}/meta/whatsapp (set KAPSO_API_BASE)\nconst x = 1;`;
    expect(offenders([{ path: 'modules/whatsapp/kapso.ts', source: comment }])).toEqual([]);
    const code = `const base = 'https://${HOST}';`;
    expect(offenders([{ path: 'modules/whatsapp/kapso.test.ts', source: code }])).toEqual([]);
  });

  it('KAPSO_API_BASE is read only where WA_API_BASE is (the env files)', () => {
    const source = 'const b = env.KAPSO_API_BASE;';
    expect(offenders([{ path: 'modules/x/x.service.ts', source }])).toEqual(['modules/x/x.service.ts: KAPSO_API_BASE']);
    expect(offenders([{ path: 'env.kapso.ts', source }])).toEqual([]);
  });
});
