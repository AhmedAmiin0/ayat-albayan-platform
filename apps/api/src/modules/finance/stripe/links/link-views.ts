import type { PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../../../../config/env/env';
import { toLinkView } from './payment-links.mapper';
import type { LinkRow } from './payment-links.queries';

/** A link's view with the platform url on the web host (WEB_ORIGIN's first origin). */
@Injectable()
export class LinkViews {
  one(row: LinkRow, now = new Date()): PaymentLinkView {
    return toLinkView(row, { webOrigin: this.webOrigin(), now });
  }

  webOrigin(): string {
    return loadEnv().WEB_ORIGIN;
  }
}
