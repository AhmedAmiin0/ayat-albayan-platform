import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { ClassroomModule } from '@/modules/teaching/classroom';
import { ChatNumber } from './home/chat-number';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonsRepo } from './lessons/portal-lessons.repo';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageRepo } from './package/portal-package.repo';
import { PortalPackageService } from './package/portal-package.service';
import { PortalController, PortalRecordsController } from './portal.controller';
import { PortalSettings } from './portal.settings';
import { PortalReportsRepo } from './reports/portal-reports.repo';
import { PortalReportsService } from './reports/portal-reports.service';
import { PortalScopes } from './scope/portal-scope';
import { PortalScopeRepo } from './scope/portal-scope.repo';

/** The family portal's API (docs/31): /portal/*, guardian and student logins only. */
@Module({
  imports: [ClassroomModule, SubscriptionsModule],
  controllers: [PortalController, PortalRecordsController],
  providers: [
    PortalScopeRepo,
    PortalScopes,
    PortalSettings,
    ChatNumber,
    PortalHomeService,
    PortalLessonsRepo,
    PortalLessonsService,
    PortalReportsRepo,
    PortalReportsService,
    PortalPackageRepo,
    PortalPackageService,
  ],
  exports: [PortalScopes],
})
export class PortalModule {}
