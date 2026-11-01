import type { PaymentLinkView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { toLinkView } from './payment-links.mapper';
import type { LinkRow } from './payment-links.queries';

/**
 * The API's public base URL (env API_PUBLIC_URL, e.g. https://api.ayatalbayan.com; docs/09): the family's
 * pages (/pay/<token>, its checkout, done and cancelled pages) are served by the API itself, so they need
 * no web build. Unset or not an http(s) URL = this process on localhost (local dev only).
 */
export function apiPublicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.API_PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/\s]+$/.test(raw) ? raw : `http://localhost:${env.PORT ?? '3000'}`;
}

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
