import {
  settingsRoutes as routes,
  type AcademySettings,
  type SettingsPatchResult,
} from '@ab/settings';
import { Controller, Optional } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '@/common/audit/singleton-entity';
import { CurrentUser } from '@/common/auth/decorators';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { splitPatchOrThrow } from './settings-patch';
import { SettingsRulesPort } from './settings-rules.port';
import { SettingsService } from './settings.service';

/**
 * Academy settings for admins (R-SCH-07, R-SCH-02): late-cancel hours (null = OFF, the default
 * until the owner picks a number, docs/05 q2), the booking horizon, and the Phase 3 keys
 * (docs/11 §2). Changes are audited. In module mode (comms_source) the 8 notification keys show what
 * the notification rules say (docs/26b m1/m3).
 */
@ApiBearerAuth()
@Controller()
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    @Optional() private readonly rules?: SettingsRulesPort,
  ) {}

  @Route(routes.view)
  async get(): Promise<AcademySettings> {
    return asResponse(routes.view.response, await this.current());
  }

  /**
   * The PATCH /settings alias, per key (docs/26 §2f, 26-P0): valid registry fields are written
   * (`saved`), keys owned by a module route are never written here (`moved`: the send gate, the
   * cut-over, comms_source, Google, the 8 notification keys), invalid ones are skipped (`invalid`).
   * followUpHours is the exception (23-P4): with notifications.manage it writes the follow-up rule.
   * The full settings stay at the top level so clients reading the answer as AcademySettings keep working.
   */
  @Route(routes.update)
  async update(
    @RouteInput() { body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<SettingsPatchResult> {
    const rules = this.rules !== undefined && can(user, 'notifications.manage');
    const { changes, saved, moved, invalid, followUpHours } = splitPatchOrThrow(body, { rules });
    const lists = { saved, moved, invalid };
    if (saved.length === 0) return { ...(await this.current()), ...lists };
    const before = await this.current();
    // The rule first: a refused rule write (503 / 422) saves nothing else and leaves nothing unaudited.
    if (followUpHours && this.rules) await this.rules.writeFollowUpHours(followUpHours, user);
    try {
      if (Object.keys(changes).length > 0) await this.settings.write(changes, user.id);
    } finally {
      // Whatever was written (the rule at least, when the settings write failed) is audited.
      await this.record(before, user);
    }
    return { ...(await this.current()), ...lists };
  }

  private async current(): Promise<AcademySettings> {
    const all = await this.settings.all();
    return this.rules ? this.rules.overlay(all) : all;
  }

  private async record(before: AcademySettings, user: AuthUser): Promise<void> {
    const after = await this.current();
    await this.audit.record({
      actorId: user.id,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: 'update',
      before: { ...before },
      after: { ...after },
    });
  }
}
