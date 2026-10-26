import {
  catalogueViews,
  type EffectiveRule,
  type NotificationEntryView,
  type NotificationKey,
  type NotificationRuleRow,
  type NotificationsOverview,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { NotificationPolicy } from './policy/policy';
import { RulesFacts } from './policy/rules.facts';
import { ruleView, v1Entry } from './rules.views';

interface V2Context {
  rules: ReadonlyMap<NotificationKey, EffectiveRule>;
  rows?: ReadonlyMap<string, NotificationRuleRow>;
}

/**
 * GET /admin/notifications: the catalogue with each row's effective state from the send gate, the
 * template registry and the EFFECTIVE rules (NotificationPolicy: legacy keys while comms_source =
 * legacy, notification_rules when module; every row off when the rules cannot be read, locked rows on).
 * Untagged clients get the frozen v1 shape; tagged ones v2 (rule, approval, mode, reach). Read-only.
 */
@Injectable()
export class RulesService {
  constructor(
    private readonly facts: RulesFacts,
    private readonly policy: NotificationPolicy,
  ) {}

  async overview(opts: { v2: boolean }): Promise<NotificationsOverview> {
    const [facts, { snapshot, rules }] = await Promise.all([this.facts.read({ reach: opts.v2 }), this.policy.all()]);
    const views = catalogueViews({ ...facts.inputs, rules });
    if (!opts.v2) return { entries: views.map(v1Entry), lines: facts.lines };
    const entries = views.map((v) => this.v2(v, { rules, rows: snapshot?.rows }));
    return { entries, lines: facts.lines, mode: snapshot?.mode ?? 'legacy', reach: facts.reach ?? { guardian: 0, teacher: 0, lead: 0 } };
  }

  /** One row in the v2 shape (the PATCH answer). */
  async entry(key: NotificationKey): Promise<NotificationEntryView> {
    const [facts, { snapshot, rules }] = await Promise.all([this.facts.read({ reach: false }), this.policy.all()]);
    const view = catalogueViews({ ...facts.inputs, rules }).find((v) => v.key === key);
    if (!view) throw new Error(`unknown notification ${key}`);
    return this.v2(view, { rules, rows: snapshot?.rows });
  }

  private v2(view: NotificationEntryView, ctx: V2Context): NotificationEntryView {
    const rule = ctx.rules.get(view.key);
    if (!rule) return view;
    return { ...view, rule: ruleView(view, rule, ctx.rows?.get(view.key) ?? null) };
  }
}
