import { joinWindowConfig, type SalesMeetingView, type SalesSubscriptionView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { KIND_STATUSES, toSalesMeeting, toSalesSubscription } from './sales.mapper';
import { SalesQueries } from './sales.queries';
import { SalesSettings } from './sales.settings';

/** The sales portal's two lists, scoped by the signed-in profile (the id comes from the login, never a param). */
@Injectable()
export class SalesService {
  constructor(
    private readonly queries: SalesQueries,
    private readonly settings: SalesSettings,
  ) {}

  /** My subscriptions, pending (trial | unpaid | paused) or confirmed (active), without any money. */
  async subscriptions(user: AuthUser, kind: keyof typeof KIND_STATUSES): Promise<SalesSubscriptionView[]> {
    const own = await this.queries.ownership(user.id);
    const rows = await this.queries.subscriptions({ studentIds: own.studentIds, statuses: KIND_STATUSES[kind] });
    return rows.map(toSalesSubscription);
  }

  /** The trial lessons booked from my leads in [from, to]; the window follows the classroom settings. */
  async meetings(user: AuthUser, range: { from: string; to: string }, now = new Date()): Promise<SalesMeetingView[]> {
    const own = await this.queries.ownership(user.id);
    const rows = await this.queries.meetings({ own, ...range });
    const win = joinWindowConfig(await this.settings.read());
    return rows.map((r) => toSalesMeeting(r, { now, win }));
  }
}
