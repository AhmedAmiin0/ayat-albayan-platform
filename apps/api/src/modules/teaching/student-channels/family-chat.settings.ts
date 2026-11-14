import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = ['family_chat_enabled'] as const satisfies readonly SettingKey[];

/**
 * settings.family_chat_enabled (docs/50 §2, default off): while off every family channel route is
 * 403 family_chat_off. Read from the cached settings on every use; the teacher side keeps its own
 * switch (teacher_student_messages_enabled).
 */
@Injectable()
export class FamilyChatSettings {
  constructor(private readonly store: SettingsService) {}

  async enabled(): Promise<boolean> {
    return (await readSlice(this.store, KEYS)).family_chat_enabled;
  }
}
