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
