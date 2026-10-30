import { clickToChatLink, type PortalHome } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { PortalScopes } from '../scope/portal-scope';
import { ChatNumber } from './chat-number';

/** GET /portal/me: the switcher (my students, or myself) and the renewal chat link. */
@Injectable()
export class PortalHomeService {
  private readonly log = new Logger(PortalHomeService.name);

  constructor(
    private readonly scopes: PortalScopes,
    private readonly chat: ChatNumber,
  ) {}

  async home(user: AuthUser): Promise<PortalHome> {
    const scope = await this.scopes.of(user);
    return { kind: scope.kind, students: scope.students, renew_url: await this.renewUrl() };
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
