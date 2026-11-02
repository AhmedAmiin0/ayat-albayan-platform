import { describe, expect, it } from 'vitest';
import { WA_ERROR } from './wa-errors.js';

describe('WA_ERROR', () => {
  it('names each Meta code once', () => {
    const codes = Object.values(WA_ERROR);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('keeps the codes Meta documents', () => {
    expect(WA_ERROR.reEngagement).toBe(131047);
    expect(WA_ERROR.undeliverable).toBe(131026);
    expect(WA_ERROR.paymentIssue).toBe(131042);
    expect(WA_ERROR.paramCountMismatch).toBe(132000);
    expect(WA_ERROR.templateMissing).toBe(132001);
    expect(WA_ERROR.recipientNotAllowed).toBe(131030);
    expect(WA_ERROR.unavailable).toBe(131060);
    expect(WA_ERROR.tokenExpired).toBe(190);
    expect(WA_ERROR.outsideWindow).toBe(470);
  });
});
