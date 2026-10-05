import { settingsUpdateSchema, type AcademySettings } from '@ab/shared';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '../../modules/teachers/http';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Permissions } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { SettingsService } from './settings.service';
import { settingsChanges } from './settings.values';

/** audit_log.entity_id of the academy-wide settings (one entity, no row id of its own). */
const SETTINGS_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

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

  @Patch()
  @Permissions('settings.write')
  async update(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AcademySettings> {
    const req = parseOrThrow(settingsUpdateSchema, body);
    const before = await this.get();
    await this.settings.write(settingsChanges(req), user.id);
    const after = await this.get();
    await this.audit.record({
      actorId: user.id,
      entity: 'settings',
      entityId: SETTINGS_ENTITY_ID,
      action: 'update',
      before: { ...before },
      after: { ...after },
    });
    return after;
  }
}
