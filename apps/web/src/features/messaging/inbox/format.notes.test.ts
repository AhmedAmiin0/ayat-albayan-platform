import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { previewText } from '@/features/messaging/inbox/format';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';

// The chats list's last line never shows «[edit]» etc. (owner 2026-10-30): the API sends last_note.
describe('previewText: notes', () => {
  it('a deleted last message reads «تم حذف هذه الرسالة», its text and file withheld', () => {
    const th = thread({ last_note: 'deleted', last_body: null, last_media_mime: null });
    expect(previewText(th)).toBe(t.inbox.deletedMessage);
  });

  it("the ad's welcome: its own text, else the label; ours carry «أنت:»", () => {
    const ours = { last_direction: 'outbound' as const, last_note: 'ad_welcome' as const };
    expect(previewText(thread({ ...ours, last_body: 'أهلًا بك' }))).toBe(`${t.inbox.you} أهلًا بك`);
    expect(previewText(thread({ ...ours, last_body: null }))).toBe(
      `${t.inbox.you} ${t.inbox.adWelcome}`,
    );
  });

  it('an unsupported echo reads «رسالة غير مدعومة»', () => {
    const th = thread({ last_direction: 'outbound', last_note: 'unsupported', last_body: null });
    expect(previewText(th)).toBe(`${t.inbox.you} ${t.inbox.unsupportedEcho}`);
  });
});
