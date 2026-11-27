import { prepareCard, type PrepareCard as Prepare } from '@ab/client-core';
import type { PortalLessons } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** The card's parts with text: the homework, then the next plan. */
const partsOf = (card: Prepare) =>
  [
    { key: 'homework', title: t.portal.homework, text: card.homework },
    { key: 'next', title: t.portal.nextPlan, text: card.nextPlan },
  ].filter((p) => p.text !== null);

const TITLE: Record<'card' | 'child' | 'own', () => string> = {
  card: () => t.portal.prepareTitle,
  child: () => t.portal.app.lesson.prepare,
  own: () => t.portal.app.lesson.prepareSelf,
};

export const titleOf = (full: boolean, own: boolean): string => {
  const key = own ? 'own' : 'child';
  return TITLE[full ? key : 'card']();
};

/** Null when the newest report left nothing to prepare; the home card shows its first part. */
export function prepareView(lessons: PortalLessons, full: boolean) {
  const card = prepareCard(lessons);
  if (!card) return null;
  const parts = partsOf(card);
  return {
    reportId: card.reportId,
    shown: full ? parts : parts.slice(0, 1),
    from: full ? (lessons.prepare?.lesson_starts_at ?? null) : null,
  };
}

export const BOX = { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12 } as const;
