import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { SalesMoneyScope, SalesTeacherAssign } from '../../../sales/sales-money';
import { LinkPackages } from './link-packages';
import { LinkViews } from './link-views';
import { PaymentLinksQueries } from './payment-links.queries';

/** What every payment-link service needs (rule 2: at most 3 constructor parameters). */
@Injectable()
export class LinkDeps {
  constructor(
    readonly links: PaymentLinksQueries,
    readonly audit: AuditService,
    readonly views: LinkViews,
  ) {}
}

/** «المعلم/ة» of the subscribe step: only for her own student (the bank path's scope), then assigned. */
@Injectable()
export class LinkSalesDeps {
  constructor(
    readonly scope: SalesMoneyScope,
    readonly teachers: SalesTeacherAssign,
  ) {}
}

/** LinkCreate's own: the release of earlier unused link packages and the sales scope of the teacher. */
@Injectable()
export class LinkCreateDeps {
  constructor(
    readonly packages: LinkPackages,
    readonly sales: LinkSalesDeps,
  ) {}
}
