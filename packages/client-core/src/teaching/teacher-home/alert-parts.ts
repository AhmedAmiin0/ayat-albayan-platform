import { clockOf, type ClockOptions, type LessonView, lessonWhenAt } from '@ab/shared';
import type { LessonChange } from './lesson-changes.js';
import type { TodayAlert } from './today-alerts.js';

// What one «تنبيهات اليوم» row says and does, shared by web and mobile: the app picks its own
// template for `text` (teacherAlerts.<text>) and fills `vars`; never money, never another teacher.

export type ChangeText = 'cancelledTeacher' | 'cancelledAdmin' | 'movedTo' | 'movedFrom' | 'movedAway';
export type AlertText = 'soon' | 'confirm' | 'report' | 'bell' | ChangeText;
/** The row's one action: the lesson sheet, the report, or «تحديد كمقروء». */
export type AlertAction = 'open' | 'report' | 'read';

export interface AlertParts {
  text: AlertText;
  vars: Record<string, string>;
  /** A second line: the reason she may read, or the bell row's body. */
  detail: string | null;
  action: AlertAction;
}

export interface PartsOptions {
  clock: ClockOptions;
  /** The lesson's student names, as the app writes them. */
  names: (lesson: LessonView) => string;
}

type Lesson = Exclude<TodayAlert, { kind: 'bell' }>;

const MOVE_RULES: readonly (readonly [ChangeText, (c: LessonChange) => boolean])[] = [
  ['cancelledTeacher', (c) => c.who === 'teacher'],
  ['cancelledAdmin', (c) => c.who === 'admin'],
  ['movedTo', (c) => c.to !== null],
  ['movedFrom', (c) => c.from !== null],
];

const changeText = (c: LessonChange): ChangeText =>
  MOVE_RULES.find(([, holds]) => holds(c))?.[0] ?? 'movedAway';

const when = (iso: string | null, clock: ClockOptions): string =>
  iso === null ? '' : lessonWhenAt(new Date(iso), clock);

function lessonVars(a: Lesson, o: PartsOptions): Record<string, string> {
  return { names: o.names(a.lesson), time: clockOf(new Date(a.lesson.starts_at), o.clock) };
}

type Build<K extends TodayAlert['kind']> = (
  a: Extract<TodayAlert, { kind: K }>,
  o: PartsOptions,
) => AlertParts;

const BUILD: { [K in TodayAlert['kind']]: Build<K> } = {
  soon: (a, o) => ({
    text: 'soon',
    vars: { ...lessonVars(a, o), minutes: String(a.minutes) },
    detail: null,
    action: 'open',
  }),
  confirm: (a, o) => ({ text: 'confirm', vars: lessonVars(a, o), detail: null, action: 'open' }),
  changed: (a, o) => ({
    text: changeText(a.change),
    vars: {
      ...lessonVars(a, o),
      to: when(a.change.to, o.clock),
      from: when(a.change.from, o.clock),
    },
    detail: a.change.reason,
    action: 'open',
  }),
  report: (a, o) => ({
    text: 'report',
    vars: { ...lessonVars(a, o), stage: a.stage },
    detail: null,
    action: 'report',
  }),
  bell: (a) => ({ text: 'bell', vars: { title: a.item.title }, detail: a.item.body, action: 'read' }),
};

/** The row's template, values, second line and action. */
export function alertParts(alert: TodayAlert, o: PartsOptions): AlertParts {
  const build = BUILD[alert.kind] as Build<TodayAlert['kind']>;
  return build(alert, o);
}
