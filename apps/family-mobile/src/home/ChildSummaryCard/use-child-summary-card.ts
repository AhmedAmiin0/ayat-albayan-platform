import { t } from '@ab/mobile-kit';
import { useChildSummary, useFamilyClock } from '@/portal';
import { lastReportLine } from './child-summary-card.helpers';
import type { ChildSummaryCardProps } from './ChildSummaryCard.types';

export function useChildSummaryCard({ student, kind }: Omit<ChildSummaryCardProps, 'onPress'>) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const s = useChildSummary(student, kind);
  const words = t.portal.app.children;
  const hint = t.portal.app.home.open.replace('{name}', student.name);
  return { clock, s, words, hint, lastLine: lastReportLine(s.lastReport, clock) };
}
