import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../../finance/subscriptions';
import { ClassroomModule } from '../../teaching/classroom';
import { ChatNumber } from './home/chat-number';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonsQueries } from './lessons/portal-lessons.queries';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageQueries } from './package/portal-package.queries';
import { PortalPackageService } from './package/portal-package.service';
import { PortalController, PortalRecordsController } from './portal.controller';
import { PortalSettings } from './portal.settings';
import { PortalReportsQueries } from './reports/portal-reports.queries';
import { PortalReportsService } from './reports/portal-reports.service';
import { PortalScopes } from './scope/portal-scope';
import { PortalScopeQueries } from './scope/portal-scope.queries';

/** The family portal's API (docs/31): /portal/*, guardian and student logins only. */
@Module({
  imports: [ClassroomModule, SubscriptionsModule],
  controllers: [PortalController, PortalRecordsController],
  providers: [
    PortalScopeQueries,
    PortalScopes,
    PortalSettings,
    ChatNumber,
    PortalHomeService,
    PortalLessonsQueries,
    PortalLessonsService,
    PortalReportsQueries,
    PortalReportsService,
    PortalPackageQueries,
    PortalPackageService,
  ],
  exports: [PortalScopes],
})
export class PortalModule {}
