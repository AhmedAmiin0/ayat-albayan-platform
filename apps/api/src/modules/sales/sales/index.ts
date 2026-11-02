export { packageSummaries } from './academy/sales-package.mapper';
export { SalesRosterRepo } from './academy/sales-roster.repo';
export { SalesAssignService } from './assign/sales-assign.service';
export { toSalesHistory } from './history/sales-history.mapper';
export { type HistoryBundle, SalesHistoryRepo } from './history/sales-history.repo';
export {
  guardianOwnerIds,
  NO_OWNERSHIP,
  ownershipOf,
  type SalesOwnership,
} from './sales-ownership';
export { enforcesOwnership, SalesOwnershipRule } from './rule/sales-ownership-rule';
export { type SalesScope, SalesScopes } from './sales-scope';
export { SalesModule } from './sales.module';
export { SalesRepo, type SalesSubscriptionRow } from './sales.repo';
export {
  inSalesScope,
  isSalesLesson,
  MEETING_STATUSES,
  type SalesLessonRow,
  salesLessonsBetween,
} from './schedule/sales-lessons';
export {
  nextLessons,
  riyadhDayRange,
  riyadhToday,
  teacherDayFacts,
  type TeacherDayFacts,
  toScheduleLesson,
  UPCOMING_DAYS,
  upcomingRange,
  withMine,
} from './schedule/sales-schedule.mapper';
export type { SalesScheduleRow } from './schedule/sales-schedule.repo';
export {
  nextStarts,
  toWeeklySlot,
  WEEKLY_RULE_COLUMNS,
  type WeeklyRuleRow,
} from './schedule/weekly-slot';
