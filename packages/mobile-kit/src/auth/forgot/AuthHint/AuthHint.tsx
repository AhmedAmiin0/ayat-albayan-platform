import { AppText } from '../../../ui/primitives/AppText';
import { type, useTheme } from '../../../theme';

/** quiet: a hint; bad: what is wrong with the field while it is typed (read out politely). */
type HintTone = 'quiet' | 'bad';

export function AuthHint({ text, tone = 'quiet' }: { text: string; tone?: HintTone }) {
  const { color } = useTheme();
  const ink: Record<HintTone, string> = { quiet: color.ink2, bad: color.bad };
  return (
    <AppText
      accessibilityLiveRegion={tone === 'bad' ? 'polite' : undefined}
      style={{
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: ink[tone],
      }}
    >
      {text}
    </AppText>
  );
}
