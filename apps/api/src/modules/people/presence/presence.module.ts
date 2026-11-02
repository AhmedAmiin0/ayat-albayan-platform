import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LastSeenInterceptor } from './last-seen.interceptor';
import { LastSeenService } from './last-seen.service';
import { PresenceController } from './presence.controller';
import { PresenceRepo } from './presence.repo';
import { PresenceService } from './presence.service';
import { PresenceSettings } from './presence.settings';

/**
 * Online status and last seen (owner 2026-10-30, docs/33): the throttled last-seen write on every
 * authenticated request (a global interceptor), GET /presence/me and /presence/staff. The student
 * channel's presence routes use the exported PresenceService.
 */
@Module({
  controllers: [PresenceController],
  providers: [
    PresenceRepo,
    PresenceSettings,
    PresenceService,
    LastSeenService,
    { provide: APP_INTERCEPTOR, useClass: LastSeenInterceptor },
  ],
  exports: [PresenceService],
})
export class PresenceModule {}
