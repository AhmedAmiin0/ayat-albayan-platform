import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ChatFileError } from '../send-file';
import { replyError } from './reply-error';

test('says the reply\'s own reason, the chat\'s file reason, else the generic line', () => {
  expect(replyError(new ApiError(404, { code: 'saved_reply_not_found' }))).toBe(t.savedReplies.errors.saved_reply_not_found);
  expect(replyError(new ApiError(413, { code: 'file_too_large' }))).toBe(t.inbox.error.file_too_large);
  expect(replyError(new ChatFileError('file_upload'))).toBe(t.inbox.error.file_upload);
  expect(replyError(new Error('offline'))).toBe(t.savedReplies.errors.generic);
});
