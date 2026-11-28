import type { AssistantCommissionStatus } from '../assistant/commission';
import type { WalletState } from '../assistant';
import type { StatusStyle } from './status-style';

/**
 * A sales commission (docs/07 §6): earned is settled money (fill); voided is struck, in the danger
 * tone (shape carries the state).
 */
export const commissionStatusStyle: Record<AssistantCommissionStatus, StatusStyle> = {
  earned: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'bad', glyph: 'struck' },
};

/** Owed is hollow, in a statement underway is half, paid is settled, voided is struck. */
export const walletStateStyle: Record<WalletState, StatusStyle> = {
  due: { tone: 'ok', glyph: 'hollow' },
  in_statement: { tone: 'neutral', glyph: 'half' },
  paid: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'neutral', glyph: 'struck' },
};
