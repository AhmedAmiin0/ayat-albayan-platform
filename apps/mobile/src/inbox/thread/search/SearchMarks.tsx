import { highlightParts } from '@ab/shared';
import { AppText } from '@/core/ui/primitives/AppText';
import { useTheme } from '@/theme';

const MARK = { fontWeight: '700', textDecorationLine: 'underline' } as const;

/**
 * The searched words marked in a bubble's text: bold with a gold underline, never a box (an Arabic
 * run keeps its joins, docs/07 §14.2; not colour alone). Nested runs of one text.
 */
export function SearchMarks({ text, q }: { text: string; q: string }) {
  const { color } = useTheme();
  return (
    <>
      {highlightParts(text, q).map((part, i) =>
        part.match ? (
          <AppText key={i} testID="search-mark" style={{ ...MARK, textDecorationColor: color.gold }}>
            {part.text}
          </AppText>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
