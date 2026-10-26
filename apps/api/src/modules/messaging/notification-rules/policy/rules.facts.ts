import type { CatalogueInputs, LineHealthView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SendGate } from '../../whatsapp/gate/send-gate';
import { NotificationRulesSettings } from '../notification-rules.settings';
import { RulesQueries, type Reach } from '../rules.queries';

interface CatalogueFacts {
  inputs: Omit<CatalogueInputs, 'rules'>;
  lines: LineHealthView[];
  /** Only when asked (v2): the head counts behind «سيصل إلى N». */
  reach: Reach | null;
}

/** What the catalogue reads besides the rules: settings slice, send gate, templates, numbers, classroom. */
@Injectable()
export class RulesFacts {
  constructor(
    private readonly settings: NotificationRulesSettings,
    private readonly gate: SendGate,
    private readonly queries: RulesQueries,
  ) {}

  async read(opts: { reach: boolean }): Promise<CatalogueFacts> {
    const [settings, state, templates, lines, reach] = await Promise.all([
      this.settings.read(),
      this.gate.state(),
      this.queries.templates(),
      this.queries.lines(),
      opts.reach ? this.queries.reach() : Promise.resolve(null),
    ]);
    return { inputs: { settings, gateReason: state.reason, templates, classroom: this.queries.classroom() }, lines, reach };
  }
}
