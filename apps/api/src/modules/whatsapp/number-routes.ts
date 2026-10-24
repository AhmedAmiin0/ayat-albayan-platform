import { Injectable, Logger, Optional } from '@nestjs/common';
import type { OverlayNumber } from '../../common/integrations/numbers-overlay';
import { RulesReader } from '../notification-rules/rules.reader';
import { routable, ruleNumbers, type RoutePass } from './number-route';
import { RouteQueries } from './route.queries';
import type { TemplateRow } from './whatsapp.types';

/**
 * Loads what one module-mode send pass routes with (docs/23c): the numbers, every template approval on
 * a number, the templates sendable on some number and each catalogue row's number. RulesReader comes
 * from the global NotificationRulesModule (optional: absent or unreadable = no rule number, never a
 * failed pass; the template's own number and the role's order still apply).
 */
@Injectable()
export class NumberRoutes {
  private readonly log = new Logger(NumberRoutes.name);

  constructor(
    private readonly queries: RouteQueries,
    @Optional() private readonly rules?: RulesReader,
  ) {}

  /** Throws only when the approvals or templates are unreadable: the pass sends nothing (fail closed). */
  async pass(numbers: readonly OverlayNumber[]): Promise<{ pass: RoutePass; templates: TemplateRow[] }> {
    const approvals = await this.queries.approvals();
    const [templates, rules] = await Promise.all([this.queries.templates(approvals), this.ruleNumbers()]);
    return { pass: { numbers: numbers.map(routable), ruleNumbers: rules, approvals }, templates };
  }

  private async ruleNumbers(): Promise<Map<string, string | null>> {
    if (!this.rules) return new Map();
    try {
      const snap = await this.rules.snapshot();
      return ruleNumbers((key) => snap.rows.get(key)?.number_id ?? null);
    } catch (e) {
      this.log.warn(`notification rules unread, routing without rule numbers: ${e instanceof Error ? e.message : String(e)}`);
      return new Map();
    }
  }
}
