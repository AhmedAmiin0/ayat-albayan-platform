import { Injectable, Optional } from '@nestjs/common';
import type { OverlayNumber } from '../../../common/integrations/numbers-overlay';
import { RulesReader } from '../../notification-rules/store/rules.reader';
import { routable, ruleNumbers, type RoutePass } from './number-route';
import { RouteQueries } from './route.queries';
import type { TemplateRow } from '../whatsapp.types';

/**
 * Loads what one module-mode send pass routes with (docs/23c): the numbers, every template approval on
 * a number, the templates sendable on some number and each catalogue row's number. RulesReader comes
 * from the global NotificationRulesModule (optional: absent = no rule numbers). An unreadable rules table
 * aborts the pass like the approvals (review: a failed read must never send from a number the admin's
 * rule did not pick); the rows wait for the next pass.
 */
@Injectable()
export class NumberRoutes {
  constructor(
    private readonly queries: RouteQueries,
    @Optional() private readonly rules?: RulesReader,
  ) {}

  /** Throws when the approvals, templates or rules are unreadable: the pass sends nothing (fail closed). */
  async pass(numbers: readonly OverlayNumber[]): Promise<{ pass: RoutePass; templates: TemplateRow[] }> {
    const approvals = await this.queries.approvals();
    const [templates, rules] = await Promise.all([this.queries.templates(approvals), this.ruleNumbers()]);
    const crm = new Set(numbers.filter((n) => n.env?.provider === 'crm').map((n) => n.id));
    return { pass: { numbers: numbers.map(routable), ruleNumbers: rules, approvals, crm }, templates };
  }

  private async ruleNumbers(): Promise<Map<string, string | null>> {
    if (!this.rules) return new Map();
    const snap = await this.rules.snapshot();
    return ruleNumbers((key) => snap.rows.get(key)?.number_id ?? null);
  }
}
