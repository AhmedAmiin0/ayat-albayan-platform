import type { AssistantAdjustmentInput, AssistantCommissionView, BroughtByInput, BroughtByResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { CommissionBell } from '../../subscriptions';
import type { CommissionsQuery } from '../assistant-pay.dto';
import { AssistantRpc } from '../assistant-pay.rpc';
import { toCommissionView } from '../commissions/commissions.mapper';
import { CommissionsQueries } from '../commissions/commissions.queries';

/**
 * The admin's hands on the money (R-ASST-02, R-ASST-05): the commission ledger, voiding a commission, a
 * manual +/- adjustment and who brought which student. Each write is one RPC (one transaction + audit row).
 */
@Injectable()
export class CorrectionsService {
  constructor(
    private readonly queries: CommissionsQueries,
    private readonly rpc: AssistantRpc,
    private readonly bell: CommissionBell,
  ) {}

  async ledger(q: CommissionsQuery): Promise<AssistantCommissionView[]> {
    return (await this.queries.list(q)).map(toCommissionView);
  }

  /** A voided commission stays voided (an admin void is terminal); a paid statement gets a negative adjustment in the next open month. */
  async voidCommission(input: { commissionId: string; reason: string; actorId: string }): Promise<{ id: string }> {
    await this.rpc.voidCommission(input);
    return { id: input.commissionId };
  }

  /** A retry with the same requestId returns the first adjustment instead of adding a second (the RPC's unique key). */
  async adjust(input: AssistantAdjustmentInput & { actorId: string }): Promise<{ id: string }> {
    return { id: await this.rpc.adjust(input) };
  }

  /**
   * One student or many; assistantId null clears it. 409 commission_exists while a live commission belongs to another
   * assistant. A change evaluates the student's paid packages, which can earn a commission: «عمولة جديدة» then.
   */
  async broughtBy(input: BroughtByInput, actorId: string): Promise<BroughtByResult> {
    const changed = await this.rpc.broughtBy({ ...input, actorId, broughtAt: input.broughtAt });
    if (changed > 0) await this.bell.notify();
    return { changed };
  }
}
