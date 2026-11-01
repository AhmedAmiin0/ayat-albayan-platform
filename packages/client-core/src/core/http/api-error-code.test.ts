import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error.js';
import { apiErrorCode, pdfPageRetryable } from './api-error-code.js';

describe('apiErrorCode', () => {
  it('the body’s code, else null', () => {
    expect(apiErrorCode(new ApiError(410, { code: 'media_expired' }))).toBe('media_expired');
    expect(apiErrorCode(new ApiError(500, 'oops'))).toBeNull();
    expect(apiErrorCode(new Error('x'))).toBeNull();
  });
});

describe('pdfPageRetryable (owner 2026-11-01: no retry storm while the sandbox is down)', () => {
  it.each([
    [new ApiError(503, { code: 'pdf_busy' }), true],
    [new ApiError(503, { code: 'pdf_render_failed' }), true],
    [new ApiError(503, null), true],
    [new ApiError(503, { code: 'pdf_unavailable' }), false],
    [new ApiError(422, { code: 'pdf_no_preview' }), false],
    [new Error('network'), false],
  ])('%o → %s', (e, retry) => {
    expect(pdfPageRetryable(e)).toBe(retry);
  });
});
