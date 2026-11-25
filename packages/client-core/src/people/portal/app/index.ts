// The family app's own rules (docs/50 §6), shared with the family web pages.
export { FAMILY_TABS, familyTabs, hasFamilyTab, type FamilyTab } from './family-tabs';
export {
  scheduleWeek, weekSchedule, weekStrip, weekSummary,
  type ChildLessons, type StripDay, type WeekDay, type WeekInput, type WeekLesson, type WeekSummary,
} from './week-schedule';
export {
  ALERT_GROUPS, alertSections, alertTarget, pushTarget,
  type AlertGroup, type AlertSection, type AlertTarget,
} from './alerts';
export {
  childSummary, reportAt, reportMonths, type ChildSummary, type ChildSummaryInput,
} from './child-summary';
export { seenStore, type SeenStorage, type SeenStore } from './seen-store';
export { familyPick, picksChild, type FamilyPick } from './family-pick';
export { familyChildren, isSelfChild } from './children-list';
export {
  cardRoom, liveRoom, liveRoomText,
  type CardRoom, type LiveRoom, type LiveRoomText, type LiveRoomWords,
} from './live-room';
export {
  PICKED_CHILD_KEY, pickStore, savedFor, type PickStore, type PickStoreState, type SavedPick,
} from './pick-store';
export {
  dayTile, dayWord, lessonMinutes, type DayTile, type DayWord, type TileWidth,
} from './day-word';
export {
  childTabPill, childTabWord, type ChildTabPill, type ChildTabWords,
} from './tab-word';
