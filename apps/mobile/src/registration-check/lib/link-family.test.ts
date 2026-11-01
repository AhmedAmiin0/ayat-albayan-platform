import { LEAD_FAMILY_LINK_ERRORS } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { linkFamilyErrorText } from './link-family';

// POST /leads/:id/link-family refusals in her words (owner 2026-10-29): every shared code has its line.
describe('linkFamilyErrorText', () => {
  it.each(LEAD_FAMILY_LINK_ERRORS.map((code) => [code]))('%s has its own line', (code) => {
    const status = code === 'lead_not_found' || code === 'student_not_found' ? 404 : 409;
    const text = linkFamilyErrorText(new ApiError(status, { code, message: code }));
    expect(text).toBe(t.inbox.linkFamily.errors[code]);
    expect(text).not.toBe(t.common.error);
  });

  it('a 403, a bad body, an unknown code or a network failure is the generic line', () => {
    expect(linkFamilyErrorText(new ApiError(403, { message: 'Forbidden' }))).toBe(t.common.error);
    expect(linkFamilyErrorText(new ApiError(400, { message: 'validation_failed', issues: [] }))).toBe(t.common.error);
    expect(linkFamilyErrorText(new ApiError(409, { code: 'toString' }))).toBe(t.common.error);
    expect(linkFamilyErrorText(new ApiError(500, 'oops'))).toBe(t.common.error);
    expect(linkFamilyErrorText(new TypeError('Network request failed'))).toBe(t.common.error);
  });
});
