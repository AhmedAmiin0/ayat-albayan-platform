import { clickToChatLink, type PortalHome } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { MeZoneRepo } from '@/common/auth/me-zone.repo';
import type { AuthUser } from '@/common/auth/verify-token';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { ChatNumber } from './chat-number';

/** GET /portal/me: the switcher (my students, or myself), the login's language, the renewal link. */
@Injectable()
export class PortalHomeService {
  private readonly log = new Logger(PortalHomeService.name);

  constructor(
    private readonly scopes: PortalScopes,
    private readonly chat: ChatNumber,
    private readonly me: MeZoneRepo,
  ) {}

  /** `locale` only when the profile holds a language the apps speak (else the app keeps its own). */
  async home(user: AuthUser): Promise<PortalHome> {
    const reads = [this.scopes.of(user), this.renewUrl(), this.me.localeOf(user.id)] as const;
    const [scope, renew_url, locale] = await Promise.all(reads);
    return { kind: scope.kind, students: scope.students, renew_url, ...(locale && { locale }) };
  }

  /** A failed number read never breaks the page: the link is simply not shown. */
  private async renewUrl(): Promise<string | null> {
    try {
      const e164 = await this.chat.e164();
      return e164 ? clickToChatLink(e164) : null;
    } catch (e) {
      this.log.warn(`chat number unavailable: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
