import type { ActivityKeys, DashboardKeys, ReportKeys } from './reporting.keys.types';

const dashboard = ['dashboard'] as const;
const reports = ['reports'] as const;
const students = [...reports, 'student'] as const;
const activity = ['activity'] as const;

// A closed admin task invalidates `all`: the summary and the work list both count tasks.
export const dashboardKeys: DashboardKeys = {
  all: dashboard,
  summary: ({ from, to }) => [...dashboard, 'summary', from, to],
  work: () => [...dashboard, 'work'],
};

// A report submit invalidates `all`, so the form, the histories and the pending list refresh
// together; a PDF retry only touches the histories under `students`.
export const reportKeys: ReportKeys = {
  all: reports,
  students,
  form: (lessonId) => [...reports, 'form', lessonId],
  student: (studentId, page) => [...students, studentId, page],
  pending: () => [...reports, 'pending'],
  link: (token) => [...reports, 'link', token],
};

export const activityKeys: ActivityKeys = {
  all: activity,
  list: (search, scope) => [...activity, search, scope ?? null],
};
