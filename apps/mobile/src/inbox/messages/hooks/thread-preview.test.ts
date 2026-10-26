import { t } from '@/core/lib/i18n/i18n';
import { threadPreview } from './message-text';
import { thread } from '../../shared/thread-fixtures';

// A chats list row's last line (R-MOB-02); Meta's `unsupported` has its own words (owner 2026-10-27).
const empty = { ...thread, last_direction: 'inbound' as const, last_body: null, last_media_mime: null, last_template_key: null };

test('a last message whose content never arrived: «رسالة لم يصل محتواها», not the generic line', () => {
  expect(threadPreview({ ...empty, last_unsupported: true })).toBe(t.inbox.previewUnsupported);
  expect(threadPreview(empty)).toBe(t.inbox.media.other);
});

test('text, files and templates read as before', () => {
  expect(threadPreview({ ...empty, last_body: 'السلام عليكم' })).toBe('السلام عليكم');
  expect(threadPreview({ ...empty, last_media_mime: 'image/jpeg', last_body: 'الواجب' })).toBe(`${t.inbox.media.image}: الواجب`);
  expect(threadPreview({ ...empty, last_direction: 'outbound', last_body: 'أهلًا' })).toBe(`${t.inbox.you} أهلًا`);
});
