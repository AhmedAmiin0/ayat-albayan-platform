import type { AssistantCommissionStatus } from '../assistant/commission.js';
import type { StatusStyle } from './status-style.js';

/** A sales commission (docs/07 §6): earned is settled money (fill); voided is struck, in the danger tone (shape carries the state). */
export const commissionStatusStyle: Record<AssistantCommissionStatus, StatusStyle> = {
  earned: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'bad', glyph: 'struck' },
};
