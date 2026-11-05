import type { ThreadView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { DeliveryTicks } from '@/inbox/messages/components/DeliveryTicks';
import { threadPreview } from '@/inbox/messages/hooks/message-text';
import { WaText } from './WaText';

/**
 * The row reads the ticks' status word before the preview (the ticks add no stop of their own);
 * failed is the row's «لم تُرسل» chip already.
 */
function ticksWord(th: ThreadView): string | undefined {
  if (th.last_direction !== 'outbound' || th.last_status === 'failed') return undefined;
  return `${t.enums.messageStatus[th.last_status]} · ${threadPreview(th)}`;
}

/** «مسوّدة:» in the act colour before the unsent text, as WhatsApp's «Draft:» (review 10-29 #4). */
function DraftWord() {
  const { color } = useTheme();
  return (
    // Hidden from the reader: the row's preview label already starts with «مسوّدة:».
    <AppText
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        fontFamily: type.ui[600],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: color.act,
      }}
    >
      {t.inbox.draft}
    </AppText>
  );
}

/** Line 2's text: one line, 14sp ink-2, WhatsApp markup drawn (not its asterisks). */
function PreviewText({ text, label }: { text: string; label: string | undefined }) {
  const { color } = useTheme();
  return (
    <WaText
      testID="thread-preview"
      text={text}
      numberOfLines={1}
      accessibilityLabel={label}
      style={{
        flexShrink: 1,
        fontFamily: type.ui[400],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: color.ink2,
      }}
    />
  );
}

/** The second line: her unsent text when the chat has one, else the last message with its ticks. */
export function ThreadPreview({ thread: th, draft }: { thread: ThreadView; draft: string }) {
  if (draft) {
    const text = draft.replace(/\s+/g, ' ').trim();
    return (
      <>
        <DraftWord />
        <PreviewText text={text} label={`${t.inbox.draft} ${text}`} />
      </>
    );
  }
  const ours = th.last_direction === 'outbound';
  return (
    <>
      {ours ? <DeliveryTicks status={th.last_status} inList /> : null}
      <PreviewText text={threadPreview(th)} label={ticksWord(th)} />
    </>
  );
}
