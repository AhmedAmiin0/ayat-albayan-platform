import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { linkError } from './link-api';

const E = t.classroom.error;

test('a coded refusal reads as its message (the 409 template gate, the 503 gate, a 404)', () => {
  expect(linkError(new ApiError(409, { code: 'template_not_approved' }))).toBe(E.template_not_approved);
  expect(linkError(new ApiError(503, { code: 'classroom_not_configured' }))).toBe(E.classroom_not_configured);
  expect(linkError(new ApiError(404, { code: 'lesson_not_found' }))).toBe(E.lesson_not_found);
});

test('a bare 403 reads «غير مسموح», anything else the generic line', () => {
  expect(linkError(new ApiError(403, null))).toBe(E.forbidden);
  expect(linkError(new ApiError(500, null))).toBe(E.unknown);
  expect(linkError(new TypeError('Network request failed'))).toBe(E.unknown);
});
