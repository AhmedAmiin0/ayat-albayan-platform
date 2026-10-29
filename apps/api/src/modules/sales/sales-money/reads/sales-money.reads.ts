import { DEFAULT_RENEWAL_PRICING, type SalesFamilyView, type SalesMoneySubscriptionView, type StudentStatus } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { SalesOwnership } from '../../sales/sales-ownership';
import { SubscriptionsService } from '../../../finance/subscriptions/subscriptions.service';
import { SalesFamilyQueries } from './sales-family.queries';
import { SalesRenewals } from './sales-renewals';
import { toSalesSubscription } from '../sales-money.mapper';

/** A family has a handful of children, each with one or two packages owed. */
const OPEN_PAGE = { page: 1, pageSize: 20 } as const;
const NOT_DUE = { renew_due: false, renewal: DEFAULT_RENEWAL_PRICING } as const;

/** What the sales subscribe flow reads besides the admin's writes: her family's students and their packages owed. */
@Injectable()
export class SalesMoneyReads {
  constructor(
    private readonly family: SalesFamilyQueries,
    private readonly subs: SubscriptionsService,
    private readonly renewals: SalesRenewals,
  ) {}

  studentStatus(studentId: string): Promise<StudentStatus> {
    return this.family.studentStatus(studentId);
  }

  /** Only the children she owns; each with its unpaid packages that still have money due, and its renewal (SalesRenewals). */
  async familyOf(phone: string, own: Pick<SalesOwnership, 'studentIds'>): Promise<SalesFamilyView> {
    const rows = await this.family.studentsOfPhone(phone);
    const mine = rows.filter((s) => own.studentIds.includes(s.id));
    const renewals = await this.renewals.of(mine);
    const students = await Promise.all(
      mine.map(async (s) => {
        const open = await this.open(s.id);
        return { id: s.id, code: s.code ?? '', name: s.name, status: s.status, teacher_id: s.teacher_id, open, ...(renewals.get(s.id) ?? NOT_DUE) };
      }),
    );
    return { students };
  }

  private async open(studentId: string): Promise<SalesMoneySubscriptionView[]> {
    const page = await this.subs.list({ ...OPEN_PAGE, studentId, status: 'unpaid' });
    return page.items.map(toSalesSubscription).filter((s) => s.due > 0);
  }
}
