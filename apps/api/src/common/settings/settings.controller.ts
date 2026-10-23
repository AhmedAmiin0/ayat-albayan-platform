import type { AcademySettings, SettingsPatchResult } from '@ab/shared';
import { Body, Controller, Get, Optional, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../audit/singleton-entity';
import { CurrentUser, Permissions } from '../auth/decorators';
import { can } from '../auth/permissions';
import type { AuthUser } from '../auth/verify-token';
import { splitPatchOrThrow } from './settings-patch';
import { SettingsRulesPort } from './settings-rules.port';
import { SettingsService } from './settings.service';

/**
 * Academy settings for admins (R-SCH-07, R-SCH-02): late-cancel hours (null = OFF, the default
 * until the owner picks a number, docs/05 q2), the booking horizon, and the Phase 3 keys
 * (docs/11 §2). Changes are audited. In module mode (comms_source) the 8 notification keys show what
 * the notification rules say (docs/26b m1/m3).
 */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    @Optional() private readonly rules?: SettingsRulesPort,
  ) {}

  @Get()
  async get(): Promise<AcademySettings> {
    const all = await this.settings.all();
    return this.rules ? this.rules.overlay(all) : all;
  }

  /**
   * The PATCH /settings alias, per key (docs/26 §2f, 26-P0): valid registry fields are written
   * (`saved`), keys owned by a module route are never written here (`moved`: the send gate, the
   * cut-over, comms_source, Google, the 8 notification keys), invalid ones are skipped (`invalid`).
   * followUpHours is the exception (23-P4): with notifications.manage it writes the follow-up rule.
   * The full settings stay at the top level so clients reading the answer as AcademySettings keep working.
   */
  @Patch()
  @Permissions('settings.write')
  async update(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SettingsPatchResult> {
    const rules = this.rules !== undefined && can(user, 'notifications.manage');
    const { changes, saved, moved, invalid, followUpHours } = splitPatchOrThrow(body, { rules });
    const lists = { saved, moved, invalid };
    if (saved.length === 0) return { ...(await this.get()), ...lists };
    const before = await this.get();
    if (Object.keys(changes).length > 0) await this.settings.write(changes, user.id);
    if (followUpHours && this.rules) await this.rules.writeFollowUpHours(followUpHours, user);
    const after = await this.get();
    await this.audit.record({
      actorId: user.id,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: 'update',
      before: { ...before },
      after: { ...after },
    });
    return { ...after, ...lists };
  }
}
