// The family app's own rules (docs/50 §6), shared with the family web pages.
export { FAMILY_TABS, familyTabs, hasFamilyTab, type FamilyTab } from './family-tabs.js';
export {
  scheduleWeek, weekSchedule,
  type ChildLessons, type WeekDay, type WeekInput, type WeekLesson,
} from './week-schedule.js';
export {
  ALERT_GROUPS, alertSections, alertTarget, pushTarget,
  type AlertGroup, type AlertSection, type AlertTarget,
} from './alerts.js';
export {
  childSummary, reportAt, reportMonths, type ChildSummary, type ChildSummaryInput,
} from './child-summary.js';
export { seenStore, type SeenStorage, type SeenStore } from './seen-store.js';
export { familyPick, picksChild, type FamilyPick } from './family-pick.js';
export { familyChildren, isSelfChild } from './children-list.js';
export {
  liveRoom, liveRoomText, type LiveRoom, type LiveRoomText, type LiveRoomWords,
} from './live-room.js';
export {
  PICKED_CHILD_KEY, pickStore, savedFor, type PickStore, type PickStoreState, type SavedPick,
} from './pick-store.js';
export { dayWord, lessonMinutes, type DayWord } from './day-word.js';
export { childTabWord, type ChildTabWords } from './tab-word.js';
