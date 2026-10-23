import {
  gateConfirmed,
  gateCutoverSchema,
  gateSwitchSchema,
  GATE_SWITCH_KEY,
  type AcademySettings,
  type GateSwitch,
} from '@ab/shared';
import { Body, Controller, HttpCode, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../../common/audit/singleton-entity';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { confirmationRequired } from './gate.errors';
import { GateSettings, type GateKey } from './gate.settings';

type KeyWrite = { key: GateKey; value: boolean; action: string };

/**
 * The send-gate switches' own routes (docs/26 §2f, §5, 26-P0): the ONLY writers of messaging_enabled,
 * auto_messages_enabled and crm_cutover_done (PATCH /settings moves them). Turning a switch ON needs
 * the exact confirmation text (GATE_CONFIRM_TEXT), checked here → 428 confirmation_required. OFF is
 * always accepted: no version, no 409, no text. GET /messages/gate stays on MessagesController.
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('messages/gate')
export class GateController {
  constructor(
    private readonly settings: GateSettings,
    private readonly audit: AuditService,
  ) {}

  @Put('sending')
  @HttpCode(200)
  sending(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AcademySettings> {
    return this.toggle('sending', body, user);
  }

  @Put('auto')
  @HttpCode(200)
  auto(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AcademySettings> {
    return this.toggle('auto', body, user);
  }

  /** The CRM cut-over tick: no confirmation (the web button has none). */
  @Put('cutover')
  @HttpCode(200)
  cutover(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AcademySettings> {
    const { done } = parseOrThrow(gateCutoverSchema, body);
    return this.writeOne({ key: 'crm_cutover_done', value: done, action: 'gate_cutover' }, user);
  }

  private toggle(sw: GateSwitch, body: unknown, user: AuthUser): Promise<AcademySettings> {
    const { on, confirmText } = parseOrThrow(gateSwitchSchema, body);
    if (on && !gateConfirmed(sw, confirmText)) throw confirmationRequired();
    return this.writeOne({ key: GATE_SWITCH_KEY[sw], value: on, action: `gate_${sw}` }, user);
  }

  private async writeOne(w: KeyWrite, user: AuthUser): Promise<AcademySettings> {
    const before = await this.settings.all();
    await this.settings.writeKey(w.key, w.value, user.id);
    const after = await this.settings.all();
    await this.audit.record({
      actorId: user.id,
      entity: 'settings',
      entityId: SINGLETON_ENTITY_ID,
      action: w.action,
      before: { [w.key]: before[w.key] },
      after: { [w.key]: after[w.key] },
    });
    return after;
  }
}
