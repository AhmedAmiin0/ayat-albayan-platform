import type { PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { toLinkView } from './payment-links.mapper';
import type { LinkRow } from './payment-links.repo';
import { apiPublicOrigin } from '@/common/http/public-origin';

export { apiPublicOrigin };

/** A link's view with the platform url on the API host (apiPublicOrigin). */
@Injectable()
export class LinkViews {
  one(row: LinkRow, now = new Date()): PaymentLinkView {
    return toLinkView(row, { payOrigin: this.payOrigin(), now });
  }

  payOrigin(): string {
    return apiPublicOrigin();
  }
}
