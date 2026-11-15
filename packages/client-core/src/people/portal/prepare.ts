import type { PortalLessons } from '@ab/shared';

// «ما المطلوب للحلقة القادمة» (docs/50 §2): the newest sent report's homework and next plan. An
// empty text is hidden, and with both empty there is no card at all.

export interface PrepareCard {
  homework: string | null;
  nextPlan: string | null;
  reportId: string;
}

const text = (value: string | null): string | null => value?.trim() || null;

export function prepareCard(lessons: Pick<PortalLessons, 'prepare'>): PrepareCard | null {
  const prepare = lessons.prepare;
  if (!prepare) return null;
  const card = {
    homework: text(prepare.homework),
    nextPlan: text(prepare.next_plan),
    reportId: prepare.report_id,
  };
  return card.homework || card.nextPlan ? card : null;
}
