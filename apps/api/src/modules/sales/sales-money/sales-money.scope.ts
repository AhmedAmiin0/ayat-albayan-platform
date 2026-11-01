import { DISCOUNTS } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { can } from '../../../common/auth/permissions';
import type { AuthUser } from '../../../common/auth/verify-token';
import { forbidden } from '../../../common/http/errors';
import { SalesQueries } from '../sales/sales.queries';
import { SalesFamilyQueries } from './reads/sales-family.queries';
import type { SalesOwnership } from '../sales/sales-ownership';

/** 403 not_your_student unless the student is one of hers. */
export function assertOwnStudent(own: Pick<SalesOwnership, 'studentIds'>, studentId: string): void {
  if (!own.studentIds.includes(studentId)) throw forbidden('not_your_student');
}

/**
 * 403 discount_not_allowed unless the discount is one of the website's pills (0/5/10/15 %, DISCOUNTS; owner
 * 2026-10-12): the admin's free 0–100 field is not hers, or a 1 SAR package plus her own recorded transfer
 * would earn the full fixed commission. A service rule (403), not a schema one: the body is the admin's.
 */
export function assertSalesDiscount(pricing: { discount?: number }): void {
  const discount = pricing.discount ?? 0;
  if (!DISCOUNTS.some((d) => d === discount)) throw forbidden('discount_not_allowed');
}

/** sales.renew_any (owner 2026-10-29/11-01, docs/16 row 38): the renew flow for ANY student, not only hers. */
export function renewsAny(user: AuthUser): boolean {
  return can(user, 'sales.renew_any');
}

/**
 * Whose money a salesperson may write (docs/16 row 17): ownershipOf(...).studentIds, i.e. the students of
 * her leads' families and the students she brought (students.brought_by), whatever settings.sales_auto_assign
 * says. Never SalesBookingScope: its OFF rule (no ownership check, row 13) is for trial bookings only.
 * With sales.renew_any (row 38; owner 2026-11-01: «renew any one without checking if it was the
 * creator») the renew flow takes ANY student: no owner, brought_by, lead or family-chat check.
 */
@Injectable()
export class SalesMoneyScope {
  constructor(
    private readonly sales: SalesQueries,
    private readonly family: SalesFamilyQueries,
  ) {}

  ownership(user: AuthUser): Promise<SalesOwnership> {
    return this.sales.ownership(user.id);
  }

  /** 403 not_your_student unless hers, whatever the key («إلغاء الباقة», a link's teacher). */
  async assertOwns(user: AuthUser, studentId: string): Promise<void> {
    assertOwnStudent(await this.ownership(user), studentId);
  }

  /** The renew flow (quote, create, transfer, its receipts): hers, or ANY student with the key. */
  async assertRenews(user: AuthUser, studentId: string): Promise<void> {
    if (!renewsAny(user)) await this.assertOwns(user, studentId);
  }

  /**
   * The chat whose files she may use as a receipt: the `phone` she is in when it is one of the student's family
   * numbers (main or second, owner 2026-10-29), else the family's main chat.
   */
  async familyChat(user: AuthUser, studentId: string, phone?: string): Promise<string> {
    await this.assertRenews(user, studentId);
    if (phone && (await this.family.phonesOf(studentId)).includes(phone)) return phone;
    return this.family.familyPhone(studentId);
  }
}
