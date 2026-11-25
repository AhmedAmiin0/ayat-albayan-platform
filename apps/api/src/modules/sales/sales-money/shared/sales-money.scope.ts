import { DISCOUNTS } from '@ab/money';
import { Injectable } from '@nestjs/common';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { SalesOwnershipRule } from '@/modules/sales/sales';
import { SalesFamilyRepo } from './sales-family.repo';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';

/** 403 not_your_student unless the student is one of hers. */
export function assertOwnStudent(own: Pick<SalesOwnership, 'studentIds'>, studentId: string): void {
  if (!own.studentIds.includes(studentId)) throw forbidden('not_your_student');
}

/**
 * 403 discount_not_allowed unless the discount is one of the website's pills (0/5/10/15 %,
 * DISCOUNTS): the admin's free 0–100 field is not hers, or a 1 SAR package plus her own recorded
 * transfer would earn the full fixed commission. A service rule (403), not a schema one: the body
 * is the admin's.
 */
export function assertSalesDiscount(pricing: { discount?: number }): void {
  const discount = pricing.discount ?? 0;
  if (!DISCOUNTS.some((d) => d === discount)) throw forbidden('discount_not_allowed');
}

/** sales.renew_any (docs/16 row 38): the renew flow for ANY student, not only hers. */
export function renewsAny(user: AuthUser): boolean {
  return can(user, 'sales.renew_any');
}

/**
 * Whose money a salesperson may write (docs/16 row 17): while SalesOwnershipRule enforces ownership
 * (sales_require_assignee AND sales_auto_assign ON) ownershipOf(...).studentIds, i.e. the students
 * of her leads' families and the students she brought (students.brought_by); otherwise ANY student.
 * With sales.renew_any (row 38) the renew flow takes ANY student, whoever created it: no owner,
 * brought_by, lead or family-chat check.
 */
@Injectable()
export class SalesMoneyScope {
  constructor(
    private readonly rule: SalesOwnershipRule,
    private readonly family: SalesFamilyRepo,
  ) {}

  /** Her ownership while the rule enforces it; null = any student (SalesOwnershipRule). */
  ownership(user: AuthUser): Promise<SalesOwnership | null> {
    return this.rule.scope(user);
  }

  /** 403 not_your_student unless hers while enforced, whatever the key. */
  async assertOwns(user: AuthUser, studentId: string): Promise<void> {
    const own = await this.ownership(user);
    if (own) assertOwnStudent(own, studentId);
  }

  /** The renew flow (quote, create, transfer, its receipts): hers, or ANY student with the key. */
  async assertRenews(user: AuthUser, studentId: string): Promise<void> {
    if (!renewsAny(user)) await this.assertOwns(user, studentId);
  }

  /**
   * The chat whose files she may use as a receipt: the `phone` she is in when it is one of the
   * student's family numbers (main or second), else the family's main chat.
   */
  async familyChat(user: AuthUser, studentId: string, phone?: string): Promise<string> {
    await this.assertRenews(user, studentId);
    if (phone && (await this.family.phonesOf(studentId)).includes(phone)) return phone;
    return this.family.familyPhone(studentId);
  }
}
