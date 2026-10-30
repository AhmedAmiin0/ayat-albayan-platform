import { LEAD_FAMILY_LINK_ERRORS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { linkedText, linkFamilyErrorText, searchErrorText } from './link-family';

const L = t.inbox.linkFamily;

describe('link-family texts', () => {
  it.each(LEAD_FAMILY_LINK_ERRORS)('%s has its own Arabic text', (code) => {
    const status = code.endsWith('not_found') ? 404 : 409;
    expect(linkFamilyErrorText(new ApiError(status, { code, message: code }))).toBe(L.errors[code]);
  });

  it('a validation body, a 403 or a network failure is the generic error', () => {
    expect(linkFamilyErrorText(new ApiError(400, { code: 'validation', issues: [] }))).toBe(t.common.error);
    expect(linkFamilyErrorText(new ApiError(403, { message: 'Forbidden resource' }))).toBe(t.common.error);
    expect(linkFamilyErrorText(new Error('offline'))).toBe(t.common.error);
  });

  it('linked: added now vs. already this family’s', () => {
    expect(linkedText({ linked: true })).toBe(L.done);
    expect(linkedText({ linked: false })).toBe(L.already);
  });

  it('the search keeps the registration check’s texts', () => {
    expect(searchErrorText(new ApiError(429, { code: 'too_many_requests' }))).toBe(t.registrationCheck.error.too_many_requests);
    expect(searchErrorText(new ApiError(500, null))).toBe(t.registrationCheck.error.generic);
  });
});
