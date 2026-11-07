import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { sendError } from './message-text';

// A refused correction (owner 2026-11-07) says why, from inbox.correction.errors.
test.each([
  ['correction_not_in_thread', t.inbox.correction.errors.correction_not_in_thread],
  ['not_correctable', t.inbox.correction.errors.not_correctable],
  ['not_your_message', t.inbox.correction.errors.not_your_message],
])('%s', (code, text) => {
  expect(sendError(new ApiError(code === 'not_your_message' ? 403 : 400, { code }))).toBe(text);
});

test('the send codes still win, and an unknown code is the plain failure', () => {
  expect(sendError(new ApiError(400, { code: 'session_closed' }))).toBe(t.inbox.error.session_closed);
  expect(sendError(new ApiError(400, { code: 'nope' }))).toBe(t.inbox.error.send_failed);
});
