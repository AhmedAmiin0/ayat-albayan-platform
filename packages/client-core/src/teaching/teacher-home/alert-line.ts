import { counted, type PluralForm } from '@ab/core';
import { fillSlots } from '../reports';
import type { AlertParts, ChangeText } from './alert-parts';

// The row's first line from the shared ar.json / en.json words (teacherAlerts.*), so web and
// mobile say exactly the same thing.

type Report = 'write' | 'resume' | 'window';

export interface AlertWords {
  soon: string;
  confirm: string;
  report: Readonly<Record<Report, string>>;
  inMinutes: Readonly<Record<PluralForm, string>>;
  cancelledTeacher: string;
  cancelledAdmin: string;
  movedTo: string;
  movedFrom: string;
  movedAway: string;
}

type Line = (p: AlertParts, w: AlertWords) => string;

const REPORTS = new Set<string>(['write', 'resume', 'window']);
const isReport = (stage: string | undefined): stage is Report => REPORTS.has(stage ?? '');

const reportTemplate = (p: AlertParts, w: AlertWords): string =>
  isReport(p.vars.stage) ? w.report[p.vars.stage] : w.report.write;

const change = (key: ChangeText): Line => (p, w) => fillSlots(w[key], p.vars);

const LINES: Record<AlertParts['text'], Line> = {
  soon: (p, w) =>
    fillSlots(w.soon, { ...p.vars, when: counted(w.inMinutes, Number(p.vars.minutes)) }),
  confirm: (p, w) => fillSlots(w.confirm, p.vars),
  report: (p, w) => fillSlots(reportTemplate(p, w), p.vars),
  bell: (p) => p.vars.title ?? '',
  cancelledTeacher: change('cancelledTeacher'),
  cancelledAdmin: change('cancelledAdmin'),
  movedTo: change('movedTo'),
  movedFrom: change('movedFrom'),
  movedAway: change('movedAway'),
};

export const alertLine = (parts: AlertParts, words: AlertWords): string =>
  LINES[parts.text](parts, words);
