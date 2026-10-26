import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { callErrorText } from './call-error';

describe('callErrorText', () => {
  it('says the API code in words, and never retries a failed call', () => {
    expect(callErrorText(new ApiError(409, { code: 'already_taken' }))).toBe(t.calls.errors.already_taken);
    expect(callErrorText(new ApiError(409, { code: 'permission_limited' }))).toBe(t.calls.errors.no_permission);
    expect(callErrorText(new ApiError(502, { code: 'call_failed', reason: 'meta_131042' }))).toBe(t.calls.errors.call_failed);
    expect(callErrorText(new Error('network'))).toBe(t.calls.errors.call_failed);
  });
});
