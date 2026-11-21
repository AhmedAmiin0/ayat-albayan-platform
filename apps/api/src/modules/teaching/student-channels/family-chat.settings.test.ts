import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { FamilyChatSettings, TeacherChatSettings } from './family-chat.settings';

// The two chat switches read from the cached settings (default off: docs/50 §2).
describe('the chat switches', () => {
  it('family_chat_enabled: off by default, on when set', async () => {
    expect(await readerOf(FamilyChatSettings).enabled()).toBe(false);
    expect(await readerOf(FamilyChatSettings, { family_chat_enabled: true }).enabled()).toBe(true);
  });

  it('teacher_student_messages_enabled: off by default, on when set', async () => {
    expect(await readerOf(TeacherChatSettings).enabled()).toBe(false);
    const on = readerOf(TeacherChatSettings, { teacher_student_messages_enabled: true });
    expect(await on.enabled()).toBe(true);
  });
});
