import { catalogueViews, type NotificationsOverview } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SendGate } from '../whatsapp/send-gate';
import { NotificationRulesSettings } from './notification-rules.settings';
import { RulesQueries } from './rules.queries';

/**
 * GET /admin/notifications (docs/23 §3 phase 1): the catalogue with each row's effective state from
 * TODAY's settings, the send gate and the template registry, plus the last good number per line.
 * Read-only: nothing here writes or sends.
 */
@Injectable()
export class RulesService {
  constructor(
    private readonly settings: NotificationRulesSettings,
    private readonly gate: SendGate,
    private readonly queries: RulesQueries,
  ) {}

  async overview(): Promise<NotificationsOverview> {
    const [settings, state, templates, lines] = await Promise.all([
      this.settings.read(),
      this.gate.state(),
      this.queries.templates(),
      this.queries.lines(),
    ]);
    return { entries: catalogueViews({ settings, gateReason: state.reason, templates }), lines };
  }
}
