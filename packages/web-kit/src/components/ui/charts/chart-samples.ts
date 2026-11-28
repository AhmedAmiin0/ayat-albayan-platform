import { t } from '@ab/web-kit/lib/i18n/i18n';

// Made-up figures for the chart showcases: one staff and one family example each.
const noop = () => undefined;

export const STAFF_BARS = {
  label: t.dashboard.bySource,
  rows: [
    { key: 'a', label: t.nav.leads, value: 12, onSelect: noop },
    { key: 'b', label: t.nav.conversations, value: 7, onSelect: noop },
    { key: 'c', label: t.nav.jobApplicants, value: 0, onSelect: noop },
  ],
};

export const FAMILY_BARS = {
  label: t.portal.attendedTab,
  rows: [
    { key: 'a', label: t.portal.app.children.attended, value: 9 },
    { key: 'b', label: t.portal.app.children.absent, value: 1 },
  ],
};

export const STAFF_SHARES = {
  label: t.dashboard.lessonsByStatus,
  segments: [
    { key: 'held', label: t.portal.app.history.attended, value: 18, glyph: 'fill' as const },
    { key: 'next', label: t.dashboard.thisWeek, value: 6, glyph: 'hollow' as const },
    {
      key: 'confirm',
      label: t.dashboard.pendingReports,
      value: 3,
      glyph: 'half' as const,
      flag: 'act' as const,
      onSelect: noop,
    },
    {
      key: 'absent',
      label: t.portal.absentTab,
      value: 1,
      glyph: 'struck' as const,
      flag: 'bad' as const,
      onSelect: noop,
    },
  ],
};

export const FAMILY_SHARES = {
  label: t.portal.app.children.attended,
  segments: [
    { key: 'came', label: t.portal.app.child.attendedSelf, value: 7, glyph: 'fill' as const },
    {
      key: 'missed',
      label: t.portal.app.child.absentSelf,
      value: 1,
      glyph: 'struck' as const,
      flag: 'bad' as const,
    },
  ],
};

export const MONTHS = ['1', '2', '3', '4', '5', '6'].map((m) => ({ key: m, label: m }));

export const STAFF_COLUMNS = {
  label: t.dashboard.byMonth,
  series: [
    { key: 'in', label: t.dashboard.revenue, values: [40, 52, 48, 61, 58, 70] },
    { key: 'cost', label: t.dashboard.teacherCost, values: [22, 27, 25, 30, 31, 33] },
  ],
  line: { key: 'margin', label: t.dashboard.grossMargin, values: [18, 25, 23, 31, 27, 37] },
};

export const FAMILY_COLUMNS = {
  label: t.portal.app.children.attended,
  series: [{ key: 'came', label: t.portal.attendedTab, values: [8, 7, 9, 8, 6, 9] }],
};

export const FIGURE_WORDS = { view: t.schedule.viewLabel, chart: 'رسم', table: 'جدول' };

export const MONTH = t.expenses.month;
