import { shape, type } from '../../theme';

/** A quote's text size (the block over a bubble). */
export const QUOTE_LINE = { fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs) };

/** The quote block's box: a bar at the inline-start, 44pt tall at least. */
export const QUOTE_BOX = {
  minHeight: shape.control.touch,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingVertical: 4,
  paddingHorizontal: 8,
  borderStartWidth: 3,
  borderRadius: shape.radius.sm,
} as const;

export const quoteLabel = (sender: string | null, text: string): string =>
  [sender, text].filter(Boolean).join(': ');

/** The quoted line, after a file's icon when it has one. */
export const quoteLine = (icon: string | null | undefined, text: string): string =>
  icon ? `${icon} ${text}` : text;
