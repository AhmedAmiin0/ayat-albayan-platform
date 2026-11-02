import { highlightParts } from '@ab/shared';
import { AppText } from '@/core/ui/primitives/AppText';
import { useTheme } from '@/theme';

/** The searched words lit up in a bubble's text (WhatsApp's yellow): nested runs of one text. */
export function SearchMarks({ text, q }: { text: string; q: string }) {
  const { color } = useTheme();
  return (
    <>
      {highlightParts(text, q).map((part, i) =>
        part.match ? (
          <AppText key={i} testID="search-mark" style={{ backgroundColor: color.goldWash }}>
            {part.text}
          </AppText>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
