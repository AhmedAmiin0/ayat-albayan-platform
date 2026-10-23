import type { AcademySettings, SettingsPatchResult } from '@ab/shared';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../audit/singleton-entity';
import { CurrentUser, Permissions } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { splitPatchOrThrow } from './settings-patch';
import { SettingsService } from './settings.service';

/**
 * Academy settings for admins (R-SCH-07, R-SCH-02): late-cancel hours (null = OFF, the default
 * until the owner picks a number, docs/05 q2), the booking horizon, and the Phase 3 keys
 * (docs/11 §2). Changes are audited.
 */
@ApiTags('settings')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  get(): Promise<AcademySettings> {
    return this.settings.all();
  }

  /**
   * The PATCH /settings alias, per key (docs/26 §2f, 26-P0): valid registry fields are written
   * (`saved`), keys owned by a module route are never written here (`moved`: the send gate, the
   * cut-over, comms_source, Google), invalid ones are skipped (`invalid`). The full settings stay at
   * the top level so clients reading the answer as AcademySettings keep working.
   */
  @Patch()
  @Permissions('settings.write')
  async update(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SettingsPatchResult> {
    const { changes, saved, moved, invalid } = splitPatchOrThrow(body);
    const lists = { saved, moved, invalid };
    if (saved.length === 0) return { ...(await this.get()), ...lists };
    const before = await this.get();
    await this.settings.write(changes, user.id);
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
