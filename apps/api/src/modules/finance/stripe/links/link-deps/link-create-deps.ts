import { Injectable } from '@nestjs/common';
import { LinkPackages } from '@/modules/finance/stripe/links/link-packages';
import { LinkSalesDeps } from './link-sales-deps';

/**
 * LinkCreate's own: the release of earlier unused link packages and the sales scope of the
 * teacher.
 */
@Injectable()
export class LinkCreateDeps {
  constructor(
    readonly packages: LinkPackages,
    readonly sales: LinkSalesDeps,
  ) {}
}
