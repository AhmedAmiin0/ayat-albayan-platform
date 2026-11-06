import { parseWaMarkup, type WaSpan, type WaStyle } from '@ab/shared';
import type { ReactNode } from 'react';
import type { TextProps, TextStyle } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { type } from '@/theme';

type Mark = keyof WaStyle;

/** Each WhatsApp mark's look; mono comes last so its font wins over bold's. */
const LOOK: Record<Mark, TextStyle> = {
  bold: { fontFamily: type.ui[700] },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  mono: { fontFamily: 'monospace' },
};
const MARKS: readonly Mark[] = ['bold', 'italic', 'strike', 'mono'];

/** A run's style: its marks' looks merged; null for a plain run. */
export function spanStyle(span: WaSpan): TextStyle | null {
  const on = MARKS.filter((m) => span[m]);
  return on.length ? on.reduce<TextStyle>((all, m) => ({ ...all, ...LOOK[m] }), {}) : null;
}

/** A plain run stays a bare string (one Text node, so the preview is found by its words). */
const runOf = (span: WaSpan, at: number): ReactNode => {
  const style = spanStyle(span);
  return style ? (
    <AppText key={`${String(at)}:${span.text}`} style={style}>
      {span.text}
    </AppText>
  ) : (
    span.text
  );
};

interface WaTextProps extends Omit<TextProps, 'children'> {
  /** A WhatsApp text: *bold*, _italic_, ~strike~, ```mono``` drawn, their markers dropped. */
  text: string;
}

/** A WhatsApp text drawn with its markup (packages/shared wa-markup), as WhatsApp draws it. */
export function WaText({ text, ...props }: WaTextProps) {
  const spans = parseWaMarkup(text);
  const plain = spans.every((s) => spanStyle(s) === null);
  return (
    <AppText {...props}>{plain ? spans.map((s) => s.text).join('') : spans.map(runOf)}</AppText>
  );
}
