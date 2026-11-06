import { describe, expect, it } from 'vitest';
import { verifyEvolution } from './webhook.evolution-auth';

// docs/19 «Evolution driver»: the instance token in x-evolution-token, compared in constant time.

const token = 'fake-instance-token';

describe('verifyEvolution', () => {
  it('the right token passes; a wrong or longer one does not', () => {
    expect(verifyEvolution({ headers: { 'x-evolution-token': token }, token })).toBe('ok');
    expect(verifyEvolution({ headers: { 'x-evolution-token': 'nope' }, token })).toBe('bad');
    expect(verifyEvolution({ headers: { 'x-evolution-token': `${token}x` }, token })).toBe('bad');
  });

  it('no header is refused; no token configured refuses everything, even an empty header', () => {
    expect(verifyEvolution({ headers: {}, token })).toBe('missing');
    expect(verifyEvolution({ headers: { 'x-evolution-token': '' }, token: undefined })).toBe('no_token');
    expect(verifyEvolution({ headers: { 'x-evolution-token': '' }, token: '' })).toBe('no_token');
  });
});
