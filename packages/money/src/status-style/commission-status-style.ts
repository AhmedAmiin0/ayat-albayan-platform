import type { AssistantCommissionStatus } from '../assistant/commission.js';
import type { WalletState } from '../assistant/index.js';
import type { StatusStyle } from './status-style.js';

/** A sales commission (docs/07 §6): earned is settled money (fill); voided is struck, in the danger tone (shape carries the state). */
export const commissionStatusStyle: Record<AssistantCommissionStatus, StatusStyle> = {
  earned: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'bad', glyph: 'struck' },
};

/** «محفظتي» (owner 2026-10-29): owed is hers, not paid yet (hollow); in a statement underway (half); paid settled; voided struck. */
export const walletStateStyle: Record<WalletState, StatusStyle> = {
  due: { tone: 'ok', glyph: 'hollow' },
  in_statement: { tone: 'neutral', glyph: 'half' },
  paid: { tone: 'ok', glyph: 'fill' },
  voided: { tone: 'neutral', glyph: 'struck' },
};
