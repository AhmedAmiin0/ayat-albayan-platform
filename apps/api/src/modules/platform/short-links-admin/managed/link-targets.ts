import { Injectable } from '@nestjs/common';
import { badRequest } from '@/common/http/errors';
import { loadEnv } from '@/config/env/env';
import { isAllowedTarget, ShortLinks, ShortLinksSettings } from '@/modules/platform/short-links';
import { expiryOf, managedHosts } from './managed.rules';

/**
 * The settings side of a managed link (docs/19): the allow-list with the extra hosts, the default
 * lifetime and the short URL's base. 400 target_not_allowed / invalid_expiry.
 */
@Injectable()
export class LinkTargets {
  constructor(
    private readonly settings: ShortLinksSettings,
    private readonly links: ShortLinks,
  ) {}

  async assertTarget(url: string): Promise<void> {
    const extra = (await this.settings.read()).short_link_extra_hosts;
    const hosts = managedHosts(loadEnv().WEB_ORIGIN, extra);
    if (!isAllowedTarget(url, hosts)) throw badRequest('target_not_allowed');
  }

  async expiry(given: string | undefined, now: Date): Promise<string> {
    const days = (await this.settings.read()).short_link_default_days;
    const when = expiryOf(given, { now, days });
    if (!when) throw badRequest('invalid_expiry');
    return when.toISOString();
  }

  /** «https://<host>/r/» (short_link_base or the API's /r/). */
  base(): Promise<string> {
    return this.links.base();
  }
}
