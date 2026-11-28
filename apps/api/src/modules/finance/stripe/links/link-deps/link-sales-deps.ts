import { Injectable } from '@nestjs/common';
import { SalesMoneyScope, SalesTeacherAssign } from '@/modules/sales/sales-money';

/** The subscribe step's teacher: own student only (the bank path's scope), then assigned. */
@Injectable()
export class LinkSalesDeps {
  constructor(
    readonly scope: SalesMoneyScope,
    readonly teachers: SalesTeacherAssign,
  ) {}
}
