import type { RuleParityDiff, RuleSettings } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { RulesJournal } from '../store/rules.journal';
import { moduleLegacyValues, ruleDifferences } from './rules.mirror';
import { RulesPersist } from '../store/rules.persist';

/**
 * The rules' side of parity and the read switch (docs/23b decision 5), used by CommunicationsService:
 * the differences between the rule and the legacy keys, and the copy rules → legacy keys done before
 * flipping back to legacy. Writes only RULE_SETTING_KEYS, never comms_source or a sending switch.
 */
@Injectable()
export class RulesParity {
  constructor(
    private readonly persist: RulesPersist,
    private readonly journal: RulesJournal,
  ) {}

  async differences(): Promise<RuleParityDiff[]> {
    return ruleDifferences(await this.persist.snapshot());
  }

  /** One settings write of every mapped key as the module path says it, audited. */
  async copyToLegacy(actorId: string): Promise<Partial<RuleSettings>> {
    const values = moduleLegacyValues(await this.persist.snapshot());
    await this.persist.writeLegacy(values, actorId);
    await this.journal.recordCopy(actorId, values);
    return values;
  }

  /** After the source flip: producers read the new mode on their next pass. */
  invalidate(): void {
    this.persist.invalidate();
  }
}
