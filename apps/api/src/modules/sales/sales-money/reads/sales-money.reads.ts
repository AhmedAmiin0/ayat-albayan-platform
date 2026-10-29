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

  /**
   * Only the children she owns, or every child with `all` (sales.renew_any, docs/16 row 38; `mine` says which are
   * hers); each with its unpaid packages that still have money due, and its renewal (SalesRenewals).
   */
  async familyOf(phone: string, scope: { own: Pick<SalesOwnership, 'studentIds'>; all: boolean }): Promise<SalesFamilyView> {
    const rows = await this.family.studentsOfPhone(phone);
    const isMine = (id: string) => scope.own.studentIds.includes(id);
    const listed = scope.all ? rows : rows.filter((s) => isMine(s.id));
    const renewals = await this.renewals.of(listed);
    const students = await Promise.all(
      listed.map(async (s) => {
        const open = await this.open(s.id);
        const due = renewals.get(s.id) ?? NOT_DUE;
        return { id: s.id, code: s.code ?? '', name: s.name, status: s.status, teacher_id: s.teacher_id, mine: isMine(s.id), open, ...due };
      }),
    );
    return { students };
  }

  /** A package a payment link is still open for is the link's to pay (docs/30), never offered for a transfer too. */
  private async open(studentId: string): Promise<SalesMoneySubscriptionView[]> {
    const page = await this.subs.list({ ...OPEN_PAGE, studentId, status: 'unpaid' });
    const owed = page.items.map(toSalesSubscription).filter((s) => s.due > 0);
    const linked = new Set(await this.family.linkPackages(owed.map((s) => s.id)));
    return owed.filter((s) => !linked.has(s.id));
  }
}
