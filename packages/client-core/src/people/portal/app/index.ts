// The family app's own rules (docs/50 §6), shared with the family web pages.
export { FAMILY_TABS, familyTabs, hasFamilyTab, type FamilyTab } from './family-tabs.js';
export {
  scheduleWeek, weekSchedule,
  type ChildLessons, type WeekDay, type WeekInput, type WeekLesson,
} from './week-schedule.js';
export {
  ALERT_GROUPS, alertSections, alertTarget,
  type AlertGroup, type AlertSection, type AlertTarget,
} from './alerts.js';
export {
  childSummary, reportAt, reportMonths, type ChildSummary, type ChildSummaryInput,
} from './child-summary.js';
export { seenStore, type SeenStorage, type SeenStore } from './seen-store.js';
export { dayWord, lessonMinutes, type DayWord } from './day-word.js';
