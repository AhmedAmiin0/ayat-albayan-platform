import type { TextProps } from 'react-native';
import { AppText } from './AppText';

/**
 * Wraps a left-to-right value in Unicode isolates (LRI … PDI). Android ignores `writingDirection`,
 * and a phone has no strong letters, so without them an RTL line prints «7730 214 55 966+».
 * Tests find isolated text with `getByText(ltr('AB-0183'))`.
 */
export function ltr(value: string): string {
  return `⁦${value}⁩`;
}

/**
 * Free text (a name, a note) spliced into a UI-language sentence, in a first-strong isolate (FSI … PDI):
 * it keeps its own direction and never reorders the sentence around it.
 */
export const isolate = (s: string): string => `\u2068${s}\u2069`;

interface LtrProps extends Omit<TextProps, 'children'> {
  /** Code, E.164 phone (format it with formatPhone), email or URL. */
  children: string;
}

/** docs/07 §14.4 LTR island: isolated, tabular digits, never wrapped. Style it like any Text. */
export function Ltr({ children, style, ...text }: LtrProps) {
  return (
    <AppText
      numberOfLines={1}
      {...text}
      style={[{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }, style]}
    >
      {ltr(children)}
    </AppText>
  );
}
