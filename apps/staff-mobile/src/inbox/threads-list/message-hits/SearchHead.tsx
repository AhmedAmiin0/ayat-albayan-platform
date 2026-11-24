import { t, AppText, type, useTheme } from '@ab/mobile-kit';

interface SearchHeadProps {
  /** The settled words of the chats' search box. */
  q: string;
  /** The words are long enough for the message search. */
  asked: boolean;
  both: boolean;
}

type Head = 'none' | 'hint' | 'chats';

const headOf = ({ q, asked, both }: SearchHeadProps): Head => {
  const heads: [boolean, Head][] = [
    [q !== '' && !asked, 'hint'],
    [both, 'chats'],
  ];
  return heads.find(([on]) => on)?.[1] ?? 'none';
};

/** The head shows something (an empty box shows none: the list then gets no header gap). */
export const hasSearchHead = (props: SearchHeadProps): boolean => headOf(props) !== 'none';

/** docs/37: message search needs at least three characters. */
export function SearchHead(props: SearchHeadProps) {
  const { color } = useTheme();
  const head = headOf(props);
  if (head === 'none') return null;
  const hint = head === 'hint';
  return (
    <AppText
      testID={hint ? 'message-hits-hint' : 'chats-section'}
      accessibilityRole={hint ? undefined : 'header'}
      style={{
        paddingHorizontal: 16,
        fontFamily: type.ui[hint ? 400 : 600],
        fontSize: type.size.xs,
        color: hint ? color.ink3 : color.ink2,
      }}
    >
      {hint ? t.inbox.messageSearch.hint : t.inbox.messageSearch.chats}
    </AppText>
  );
}
