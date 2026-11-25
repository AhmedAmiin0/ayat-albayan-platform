import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { InboxModule } from '@/modules/messaging/inbox';
import { LinkExpiryJob } from './expiry/expiry.job';
import { LinkExpiryRepo } from './expiry/expiry.repo';
import { LinkExpiry } from './expiry/expiry.service';
import { GateLimit } from './gate/gate.limit';
import { GatePublicController, GateSignedInController } from './gate/gate.controller';
import { GateService } from './gate/gate.service';
import { LinkTargets } from './managed/link-targets';
import { LinkUsersRepo } from './managed/link-users.repo';
import { LinkUsersSync } from './managed/link-users-sync';
import { ManagedLinksController } from './managed/managed.controller';
import { ManagedLinksRepo } from './managed/managed-links.repo';
import { ManagedLinks } from './managed/managed-links.service';
import { ManagedReads } from './managed/managed-reads';
import { ShortLinksAdmin } from './managed/short-links-admin';
import { LinkPeopleRepo } from './people';
import { LinkSend } from './send/link-send';
import { ShortLinksModule } from '@/modules/platform/short-links';

/**
 * Managed short links for the admin and sales (docs/19): the admin routes, the
 * web gate's public routes, the WhatsApp send and the expiry cron. The system links stay in
 * ShortLinksModule; SHORT_LINK_CODES comes from the global SignInModule.
 */
@Module({
  imports: [ShortLinksModule, InboxModule],
  controllers: [ManagedLinksController, GatePublicController, GateSignedInController],
  providers: [
    RateLimitRepo,
    ManagedLinksRepo,
    LinkUsersRepo,
    LinkPeopleRepo,
    LinkTargets,
    LinkUsersSync,
    ManagedLinks,
    ManagedReads,
    LinkSend,
    ShortLinksAdmin,
    GateLimit,
    GateService,
    LinkExpiryRepo,
    LinkExpiry,
    LinkExpiryJob,
  ],
})
export class ShortLinksAdminModule {}
