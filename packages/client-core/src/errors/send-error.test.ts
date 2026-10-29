import { describe, expect, it } from 'vitest';
import { sendErrorReason } from './send-error.js';

const errors = {
  '131042': 'billing',
  network: 'offline',
  unknown: 'Something went wrong ({code})',
};

describe('sendErrorReason (R-MSG-05)', () => {
  it('a known code: its line', () => {
    expect(sendErrorReason('131042', errors)).toBe('billing');
    expect(sendErrorReason('network', errors)).toBe('offline');
  });

  it('an unknown code carries the code; «unknown» itself never shows the literal {code}', () => {
    expect(sendErrorReason('http_500', errors)).toBe('Something went wrong (http_500)');
    expect(sendErrorReason('unknown', errors)).toBe('Something went wrong (unknown)');
    expect(sendErrorReason('unknown', errors)).not.toContain('{code}');
  });

  it('no code: a dash', () => {
    expect(sendErrorReason(null, errors)).toBe('Something went wrong (—)');
    expect(sendErrorReason(undefined, errors)).toBe('Something went wrong (—)');
    expect(sendErrorReason('', errors)).toBe('Something went wrong (—)');
  });
});
