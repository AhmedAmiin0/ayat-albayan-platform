import type { SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { readSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = ['family_chat_enabled'] as const satisfies readonly SettingKey[];
const TEACHER_KEYS = ['teacher_student_messages_enabled'] as const satisfies readonly SettingKey[];

/**
 * settings.family_chat_enabled (docs/50 §2, default off): while off every family channel route is
 * 403 family_chat_off, and so is the assistant's write path (she writes to the family). Read from
 * the cached settings on every use; the teacher side keeps its own switch (TeacherChatSettings).
 */
@Injectable()
export class FamilyChatSettings {
  constructor(@Inject(SettingsService) private readonly store: SettingsService) {}

  async enabled(): Promise<boolean> {
    return (await readSlice(this.store, KEYS)).family_chat_enabled;
  }
}

/** Default off: while off the teacher has no chat page, so chat sends teachers no push or bell. */
@Injectable()
export class TeacherChatSettings {
  constructor(@Inject(SettingsService) private readonly store: SettingsService) {}

  async enabled(): Promise<boolean> {
    return (await readSlice(this.store, TEACHER_KEYS)).teacher_student_messages_enabled;
  }
}
