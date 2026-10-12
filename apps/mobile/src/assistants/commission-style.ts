import type { AssistantCommissionStatus, StatusStyle } from '@ab/shared';

/** Earned is settled money (fill); voided is struck, in the danger tone (web status.ts). */
export const commissionStatusStyle: Record<AssistantCommissionStatus, StatusStyle> = {
  earned: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'bad', glyph: 'struck' },
};
