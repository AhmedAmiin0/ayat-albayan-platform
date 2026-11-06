import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

interface SearchHeadProps {
  /** The settled words of the chats' search box. */
  q: string;
  /** The words are long enough for the message search. */
  asked: boolean;
  /** Chats and message hits both show: the chats get their «المحادثات» label. */
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

/**
 * Above the chats while searching (docs/37, as the web's SearchHead): at 1–2 characters the hint
 * that the message search needs three; once both sections show, «المحادثات» over the chats.
 */
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
