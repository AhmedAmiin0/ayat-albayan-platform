import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { forbidden } from '../scheduling/errors';
import { SalesQueries } from '../sales/sales.queries';
import { SalesFamilyQueries } from './sales-family.queries';
import type { SalesOwnership } from '../sales/sales-ownership';

/** 403 not_your_student unless the student is one of hers. */
export function assertOwnStudent(own: Pick<SalesOwnership, 'studentIds'>, studentId: string): void {
  if (!own.studentIds.includes(studentId)) throw forbidden('not_your_student');
}

/**
 * Whose money a salesperson may write (docs/16 row 17): ownershipOf(...).studentIds, i.e. the students of
 * her leads' families and the students she brought (students.brought_by), whatever settings.sales_auto_assign
 * says. Never SalesBookingScope: its OFF rule (no ownership check, row 13) is for trial bookings only.
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

  async assertOwns(user: AuthUser, studentId: string): Promise<void> {
    assertOwnStudent(await this.ownership(user), studentId);
  }

  /** The phone of her student's family chat (the only chat whose files she may use as a receipt). */
  async familyChat(user: AuthUser, studentId: string): Promise<string> {
    await this.assertOwns(user, studentId);
    return this.family.familyPhone(studentId);
  }
}
