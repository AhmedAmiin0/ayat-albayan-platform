import { describe, expect, it } from 'vitest';
import { mayHaveReached } from './failure';
import { errno } from './http.fakes';

describe('mayHaveReached', () => {
  it.each([
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'UND_ERR_CONNECT_TIMEOUT',
  ])('%s never left: false', (code) => {
    expect(mayHaveReached(errno(code))).toBe(false);
  });

  it('a reset or a socket error may have reached the peer', () => {
    expect(mayHaveReached(errno('ECONNRESET'))).toBe(true);
    expect(mayHaveReached(errno('UND_ERR_SOCKET'))).toBe(true);
  });

  it('unknown errors count as reached', () => {
    expect(mayHaveReached(new Error('boom'))).toBe(true);
    expect(mayHaveReached('boom')).toBe(true);
    expect(mayHaveReached({ cause: { code: 'ECONNREFUSED' } })).toBe(true);
  });
});
