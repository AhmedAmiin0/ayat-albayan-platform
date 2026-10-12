import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';
import { SalesQueries } from '../sales/sales.queries';
import type { BookingOwnership } from './sales-booking.scope';

/**
 * The ownership /sales/booking checks (owner 2026-10-12: «if auto assign is turned off dont validate over it
 * from the sales side»): settings.sales_auto_assign ON = her leads, families and students (ownershipOf); OFF =
 * null, no ownership check, so any salesperson may register any lead (the trial-only rules still hold, and
 * brought_by still credits her). leads.assigned_to is never changed here. A failed read throws (500).
 */
@Injectable()
export class SalesBookingScope {
  constructor(
    private readonly sales: SalesQueries,
    private readonly settings: SettingsService,
  ) {}

  async of(user: AuthUser): Promise<BookingOwnership> {
    return (await this.settings.salesAutoAssign()) ? this.sales.ownership(user.id) : null;
  }
}
