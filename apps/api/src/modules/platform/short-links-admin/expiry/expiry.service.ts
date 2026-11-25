import { Injectable, Inject } from '@nestjs/common';
import { ShortLinksSettings } from '@/modules/platform/short-links';
import { LinkExpiryRepo } from './expiry.repo';

const DAY_MS = 86_400_000;

/** The purge's cutoff: links that expired more than `days` days before now. */
export const purgeCutoff = (now: Date, days: number): Date =>
  new Date(now.getTime() - days * DAY_MS);

/**
 * The managed links' lifecycle (docs/19): stop at expiry, delete
 * short_link_purge_days later with their users and visits. Running a pass twice changes nothing.
 */
@Injectable()
export class LinkExpiry {
  constructor(
    @Inject(LinkExpiryRepo) private readonly repo: LinkExpiryRepo,
    @Inject(ShortLinksSettings) private readonly settings: ShortLinksSettings,
  ) {}

  expire(now = new Date()): Promise<number> {
    return this.repo.expire(now);
  }

  async purge(now = new Date()): Promise<number> {
    const days = (await this.settings.read()).short_link_purge_days;
    return this.repo.purge(purgeCutoff(now, days));
  }
}
