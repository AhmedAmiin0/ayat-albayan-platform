export { SalesAssignService } from './assign/sales-assign.service';
export { toSalesHistory } from './history/sales-history.mapper';
export { type HistoryBundle, SalesHistoryQueries } from './history/sales-history.queries';
export {
  guardianOwnerIds,
  NO_OWNERSHIP,
  ownershipOf,
  type SalesOwnership,
} from './sales-ownership';
export { type SalesScope, SalesScopes } from './sales-scope';
export { SalesModule } from './sales.module';
export { SalesQueries, type SalesSubscriptionRow } from './sales.queries';
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
export type { SalesScheduleRow } from './schedule/sales-schedule.queries';
export {
  nextStarts,
  toWeeklySlot,
  WEEKLY_RULE_COLUMNS,
  type WeeklyRuleRow,
} from './schedule/weekly-slot';
