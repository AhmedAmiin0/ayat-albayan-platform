import {
  gateConfirmed,
  gateCutoverSchema,
  gateSwitchSchema,
  GATE_SWITCH_KEY,
  type AcademySettings,
  type GateSwitch,
  SETTING_DEFAULTS,
} from '@ab/shared';
import { Controller, HttpCode, Logger, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { SINGLETON_ENTITY_ID } from '@/common/audit/singleton-entity';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { confirmationRequired } from './gate.errors';
import { GateSettings, type GateKey } from './gate.settings';

type KeyWrite = { key: GateKey; value: boolean; action: string };
type SwitchBody = z.output<typeof gateSwitchSchema>;
type CutoverBody = z.output<typeof gateCutoverSchema>;

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
  private readonly logger = new Logger(GateController.name);

  constructor(
    private readonly settings: GateSettings,
    private readonly audit: AuditService,
  ) {}

  @Put('sending')
  @HttpCode(200)
  sending(
    @ZodBody(gateSwitchSchema) body: SwitchBody,
    @CurrentUser() user: AuthUser,
  ): Promise<AcademySettings> {
    return this.toggle('sending', body, user);
  }

  @Put('auto')
  @HttpCode(200)
  auto(
    @ZodBody(gateSwitchSchema) body: SwitchBody,
    @CurrentUser() user: AuthUser,
  ): Promise<AcademySettings> {
    return this.toggle('auto', body, user);
  }

  /** The CRM cut-over tick: no confirmation (the web button has none). */
  @Put('cutover')
  @HttpCode(200)
  cutover(
    @ZodBody(gateCutoverSchema) { done }: CutoverBody,
    @CurrentUser() user: AuthUser,
  ): Promise<AcademySettings> {
    return this.writeOne({ key: 'crm_cutover_done', value: done, action: 'gate_cutover' }, user);
  }

  private toggle(sw: GateSwitch, body: SwitchBody, user: AuthUser): Promise<AcademySettings> {
    const { on, confirmText } = body;
    if (on && !gateConfirmed(sw, confirmText)) throw confirmationRequired();
    return this.writeOne({ key: GATE_SWITCH_KEY[sw], value: on, action: `gate_${sw}` }, user);
  }

  /**
   * The write comes first and is the only step that may fail the request: a failed read before it
   * (cold cache, DB hiccup) must never refuse an OFF, and a failed audit or re-read after it must not
   * report a saved switch as failed (the admin would retry). Those are logged instead.
   */
  private async writeOne(w: KeyWrite, user: AuthUser): Promise<AcademySettings> {
    const before = await this.settled('read', () => this.settings.all());
    await this.settings.writeKey(w.key, w.value, user.id);
    const after = await this.settled('re-read', () => this.settings.all());
    await this.settled('audit', () =>
      this.audit.record({
        actorId: user.id,
        entity: 'settings',
        entityId: SINGLETON_ENTITY_ID,
        action: w.action,
        before: { [w.key]: before ? before[w.key] : null },
        after: { [w.key]: w.value },
      }),
    );
    return { ...(after ?? before ?? SETTING_DEFAULTS), [w.key]: w.value };
  }

  /** A step around the write: its failure is logged and yields null, never a failed request. */
  private async settled<T>(step: string, run: () => Promise<T>): Promise<T | null> {
    try {
      return await run();
    } catch (e) {
      this.logger.error(`gate ${step} failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
