import { portalHomeSchema, type PortalGuardian, type PortalHome } from '@ab/shared';
import { clickToChatLink } from '@ab/core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { MeZoneRepo } from '@/common/auth/me-zone.repo';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { ChatNumber } from './chat-number';
import { PortalGuardianRepo } from './portal-guardian.repo';

@Injectable()
export class PortalHomeService {
  private readonly log = new Logger(PortalHomeService.name);

  constructor(
    private readonly scopes: PortalScopes,
    private readonly chat: ChatNumber,
    @Inject(MeZoneRepo) private readonly me: MeZoneRepo,
    @Inject(PortalGuardianRepo) private readonly guardians: PortalGuardianRepo,
  ) {}

  /** `locale`: null while the login never chose one (the app keeps its own). */
  async home(user: AuthUser): Promise<PortalHome> {
    const reads = [
      this.scopes.withTestFlags(user),
      this.renewUrl(),
      this.me.localeOf(user.id),
      this.guardianOf(user),
    ] as const;
    const [scope, renew_url, locale, guardian] = await Promise.all(reads);
    const home = { kind: scope.kind, students: scope.students, renew_url, locale, guardian };
    return asResponse(portalHomeSchema, home);
  }

  /** Only a guardian login has a guardian row; a student login gets null. */
  private guardianOf(user: AuthUser): Promise<PortalGuardian | null> {
    return user.role === 'guardian' ? this.guardians.ownOf(user.id) : Promise.resolve(null);
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
