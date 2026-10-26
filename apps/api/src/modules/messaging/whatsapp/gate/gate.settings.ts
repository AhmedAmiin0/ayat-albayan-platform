import type { AcademySettings } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../../../common/settings/settings.service';

/** The keys only the gate routes write (docs/26 §5; PATCH /settings moves them). */
export type GateKey = 'messaging_enabled' | 'auto_messages_enabled' | 'crm_cutover_done';

/**
 * The gate routes' settings access (docs/25 §4 reader pattern): the full settings (the answer the
 * web caches as ['settings']) and a write of ONE gate key. Never any other key.
 */
@Injectable()
export class GateSettings {
  constructor(private readonly store: SettingsService) {}

  all(): Promise<AcademySettings> {
    return this.store.all();
  }

  writeKey(key: GateKey, value: boolean, actorId: string): Promise<void> {
    // Unversioned: an OFF must never fail over a version read or a concurrent save (docs/26 §2f).
    return this.store.writeSwitch(key, value, actorId);
  }
}
