import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { ClassroomModule } from '@/modules/teaching/classroom';
import { BookingModule } from '@/modules/teaching/booking';
import { LessonsModule } from '@/modules/teaching/lessons';
import { PortalLessonActions } from './actions/portal-actions.service';
import { PortalActionDeps } from './actions/portal-action.deps';
import { PortalLessonActionsController } from './actions/portal-actions.controller';
import { PortalSlotsService } from './actions/portal-slots.service';
import { ChatNumber } from './home/chat-number';
import { PortalHistoryRepo } from './history/portal-history.repo';
import { PortalHistoryService } from './history/portal-history.service';
import { PortalGuardianRepo } from './home/portal-guardian.repo';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonExtras } from './lessons/portal-lesson-extras';
import { PortalLessonsRepo } from './lessons/portal-lessons.repo';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageRepo } from './package/portal-package.repo';
import { PortalPackageService } from './package/portal-package.service';
import { PortalController } from './portal.controller';
import { PortalRecordsController } from './portal-records.controller';
import { PortalSettings } from './portal.settings';
import { PortalReportsRepo } from './reports/portal-reports.repo';
import { PortalReportsService } from './reports/portal-reports.service';
import { PortalScopes } from './scope/portal-scope';
import { PortalScopeRepo } from './scope/portal-scope.repo';

/**
 * The family portal's API (docs/31): /portal/*, guardian and student logins only; the family's
 * lesson actions reuse the lessons module's services and the booking slot grid.
 */
@Module({
  imports: [ClassroomModule, LessonsModule, SubscriptionsModule, BookingModule],
  controllers: [PortalController, PortalRecordsController, PortalLessonActionsController],
  providers: [
    PortalScopeRepo,
    PortalScopes,
    PortalSettings,
    ChatNumber,
    PortalGuardianRepo,
    PortalHomeService,
    PortalLessonsRepo,
    PortalLessonsService,
    PortalReportsRepo,
    PortalReportsService,
    PortalPackageRepo,
    PortalPackageService,
    PortalHistoryRepo,
    PortalHistoryService,
    PortalLessonExtras,
    PortalActionDeps,
    PortalLessonActions,
    PortalSlotsService,
  ],
  exports: [PortalScopes, PortalReportsRepo],
})
export class PortalModule {}
