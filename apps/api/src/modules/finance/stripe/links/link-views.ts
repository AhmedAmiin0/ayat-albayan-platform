import { paymentLinkRoutes, type PaymentLinkStatus, type PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { apiPublicOrigin } from '@/common/http/public-origin';
import { asResponse } from '@/common/http/returns';
import { toLinkView } from './payment-links.mapper';
import type { LinkRow } from './payment-links.repo';

export { apiPublicOrigin };

const hasStatus = (status: PaymentLinkStatus | undefined) => (view: PaymentLinkView) =>
  !status || view.status === status;

/** A link's view with the platform url on the API host (apiPublicOrigin). */
@Injectable()
export class LinkViews {
  one(row: LinkRow, now = new Date()): PaymentLinkView {
    return toLinkView(row, { payOrigin: this.payOrigin(), now });
  }

  /** By the status it reads as now: an open link past its expiry is listed as expired. */
  listed(rows: LinkRow[], by: { status?: PaymentLinkStatus; now: Date }): PaymentLinkView[] {
    const views = rows.map((r) => this.one(r, by.now)).filter(hasStatus(by.status));
    return asResponse(paymentLinkRoutes.list.response, views);
  }

  payOrigin(): string {
    return apiPublicOrigin();
  }
}
