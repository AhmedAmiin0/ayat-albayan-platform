import type { SalesFamilyView, SalesMoneySubscriptionView } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { DEFAULT_RENEWAL_PRICING, type SubscriptionView } from '@ab/money';
import { Injectable } from '@nestjs/common';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import { SubscriptionsService } from '@/modules/finance/subscriptions/shared/subscriptions.service';
import { SalesFamilyRepo, toSalesSubscription } from '@/modules/sales/sales-money/shared';
import { SalesRenewals } from './sales-renewals';

/** A family has a handful of children, each with one or two packages owed. */
const OPEN_PER_STUDENT = 20;
const NOT_DUE = { renew_due: false, renewal: DEFAULT_RENEWAL_PRICING } as const;

/**
 * What the sales subscribe flow reads besides the admin's writes: her family's students and their
 * packages owed.
 */
@Injectable()
export class SalesMoneyReads {
  constructor(
    private readonly family: SalesFamilyRepo,
    private readonly subs: SubscriptionsService,
    private readonly renewals: SalesRenewals,
  ) {}

  studentStatus(studentId: string): Promise<StudentStatus> {
    return this.family.studentStatus(studentId);
  }

  /**
   * Only the children she owns, or every child with `all` (sales.renew_any, docs/16 row 38; `mine`
   * says which are hers); each with its unpaid packages that still have money due, and its renewal
   * (SalesRenewals). `own` null (SalesOwnershipRule not enforcing): every child, each `mine`
   * (she may act on it).
   */
  async familyOf(phone: string, scope: { own: Pick<SalesOwnership, 'studentIds'> | null; all: boolean }): Promise<SalesFamilyView> {
    const rows = await this.family.studentsOfPhone(phone);
    const isMine = (id: string) => !scope.own || scope.own.studentIds.includes(id);
    const listed = scope.all ? rows : rows.filter((s) => isMine(s.id));
    const [renewals, open] = await Promise.all([this.renewals.of(listed), this.open(listed)]);
    const students = listed.map((s) => {
      const due = renewals.get(s.id) ?? NOT_DUE;
      const owed = open.filter((o) => o.student.id === s.id);
      return { id: s.id, code: s.code ?? '', name: s.name, status: s.status, teacher_id: s.teacher_id, mine: isMine(s.id), open: owed, ...due };
    });
    return { students };
  }

  /**
   * A package a payment link is still open for is the link's to pay (docs/30), never offered for a
   * transfer too.
   */
  private async open(students: readonly { id: string }[]): Promise<SalesMoneySubscriptionView[]> {
    const unpaid = await this.subs.unpaidOf(students.map((s) => s.id));
    const owed = firstPerStudent(unpaid).map(toSalesSubscription).filter((s) => s.due > 0);
    const linked = new Set(await this.family.linkPackages(owed.map((s) => s.id)));
    return owed.filter((s) => !linked.has(s.id));
  }
}

/** The newest OPEN_PER_STUDENT unpaid packages of each student: one list page each, as before. */
function firstPerStudent(views: readonly SubscriptionView[]): SubscriptionView[] {
  const seen = new Map<string, number>();
  return views.filter((v) => {
    const n = (seen.get(v.student.id) ?? 0) + 1;
    seen.set(v.student.id, n);
    return n <= OPEN_PER_STUDENT;
  });
}
