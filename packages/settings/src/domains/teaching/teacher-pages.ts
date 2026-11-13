import type { SettingDef } from '../../defs.js';

// Owner 2026-11-13 «disable … for now» + «enable them via admin portal»: one switch per teacher
// page or button, off by default. UI only: the teacher stops seeing and reaching the page on web
// and mobile; the API, the data and the pushes are unchanged. Admin, sales and assistant screens
// never read these.

const teacherSwitch = (name: string) =>
  ({
    module: 'teacher_pages', group: 'teachers',
    type: 'bool', default: false, public: true,
    labelKey: `settings.${name}`, hintKey: `settings.hints.${name}`,
  }) as const satisfies SettingDef;

/** «صفحات المعلم»: seven switches, a missing row reads as off (the seeder stores JSON null). */
export const TEACHER_PAGE_SETTINGS = {
  teacher_chats_enabled: teacherSwitch('teacherChatsEnabled'),
  teacher_student_messages_enabled: teacherSwitch('teacherStudentMessagesEnabled'),
  teacher_earnings_enabled: teacherSwitch('teacherEarningsEnabled'),
  teacher_statements_enabled: teacherSwitch('teacherStatementsEnabled'),
  teacher_feedback_enabled: teacherSwitch('teacherFeedbackEnabled'),
  teacher_internal_meetings_enabled: teacherSwitch('teacherInternalMeetingsEnabled'),
  teacher_scheduled_meetings_enabled: teacherSwitch('teacherScheduledMeetingsEnabled'),
} as const satisfies Record<string, SettingDef>;

/** The teacher page (or meetings button) → the setting that shows it. Web and mobile read this. */
export const TEACHER_PAGE_SWITCH = {
  chats: 'teacher_chats_enabled',
  messages: 'teacher_student_messages_enabled',
  earnings: 'teacher_earnings_enabled',
  statements: 'teacher_statements_enabled',
  feedback: 'teacher_feedback_enabled',
  internalMeetings: 'teacher_internal_meetings_enabled',
  scheduledMeetings: 'teacher_scheduled_meetings_enabled',
} as const satisfies Record<string, keyof typeof TEACHER_PAGE_SETTINGS>;
export type TeacherPage = keyof typeof TEACHER_PAGE_SWITCH;

/** The seven keys in «القيم» and /admin/settings order (value-groups.ts, layout.ts). */
export const TEACHER_PAGE_KEYS = [
  'teacher_chats_enabled',
  'teacher_student_messages_enabled',
  'teacher_earnings_enabled',
  'teacher_statements_enabled',
  'teacher_feedback_enabled',
  'teacher_internal_meetings_enabled',
  'teacher_scheduled_meetings_enabled',
] as const satisfies readonly (keyof typeof TEACHER_PAGE_SETTINGS)[];

/** A gated teacher route or row → the switches that open it (meetings: either meetings button). */
const TEACHER_GATE_PAGES = {
  chats: ['chats'],
  messages: ['messages'],
  earnings: ['earnings'],
  statements: ['statements'],
  feedback: ['feedback'],
  meetings: ['internalMeetings', 'scheduledMeetings'],
} as const satisfies Record<string, readonly TeacherPage[]>;
export type TeacherGate = keyof typeof TEACHER_GATE_PAGES;

type TeacherSwitches = Readonly<Record<(typeof TEACHER_PAGE_KEYS)[number], boolean>>;

/** Is this teacher page (or meetings button) on in these settings? */
export const teacherPageOn = (config: TeacherSwitches, page: TeacherPage): boolean =>
  config[TEACHER_PAGE_SWITCH[page]];

/** Does this gated route open: any of its switches on? */
export const teacherGateOpen = (config: TeacherSwitches, gate: TeacherGate): boolean =>
  TEACHER_GATE_PAGES[gate].some((page) => teacherPageOn(config, page));
