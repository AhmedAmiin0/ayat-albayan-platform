import { t } from '../../../lib/i18n/i18n';
import { palette, shape, type } from '../../../theme';

export const BOX = {
  minHeight: shape.control.touch,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.dark.sunk,
} as const;
export const FAILED = { fontFamily: type.ui[600], fontSize: type.size.sm, color: palette.dark.ink };

/** The viewer's side padding, taken off the screen width. */
const SIDES = 16;

export const pageWidth = (screen: number): number => screen - SIDES;

export const pageLabel = (page: number, pages: number): string =>
  t.inbox.pdf.pageOf.replace('{n}', String(page)).replace('{total}', String(pages));

/** What a tap does: ask again when it failed, open the page once it has an image, else nothing. */
export function pressOf(p: { failed: boolean; retry: () => void; zoom?: () => void }) {
  if (p.failed) return p.retry;
  return p.zoom;
}
