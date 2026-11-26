import { useState } from 'react';
import { ScrollView } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t, space, type, useTheme, AppText, ErrorLine } from '@ab/mobile-kit';
import { ClosedNote } from '@/inbox/thread/components/ClosedNote';
import { ReplySheetFrame } from '@/inbox/saved-replies/quick-list/ReplySheetFrame';
import { appendComposerText } from '@/inbox/composer/draft-store';
import { QuoteActions } from '@/inbox/composer/quote/QuoteActions';
import { useQuoteSend, useQuoteSheet } from '@/inbox/composer/quote/use-quote-sheet';
import { QuoteChoices } from './QuoteChoices';
import { QuotePreview } from './QuotePreview';
import type { QuoteSheetProps } from './QuoteSheet.types';

const q = t.inbox.quote;

const CONTENT = { gap: space[4], paddingHorizontal: space[4], paddingBottom: space[6] };
const TITLE = {
  fontFamily: type.ui[700],
  fontSize: type.size.lg,
  lineHeight: type.lineHeight(type.size.lg),
};
const COPIED = { fontFamily: type.ui[500], fontSize: type.size.sm };

/** Works for a lead with no student; nothing is created. */
export function QuoteSheet({ phone, open, onClose }: QuoteSheetProps) {
  const { color } = useTheme();
  const sheet = useQuoteSheet(phone);
  const sender = useQuoteSend(phone, onClose);
  // Copy falls back to the share sheet when the clipboard fails.
  const [copied, setCopied] = useState<'copied' | 'shared' | 'failed' | null>(null);
  const { text, held } = sheet.offer;
  const ready = text !== null && !held;
  const edit = () => {
    if (!text) return;
    appendComposerText(phone, text);
    onClose();
  };
  return (
    <ReplySheetFrame onClose={() => !sender.pending && onClose()} tall>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={CONTENT}>
        <AppText accessibilityRole="header" style={{ ...TITLE, color: color.ink }}>
          {q.title}
        </AppText>
        <QuoteChoices phone={phone} sheet={sheet} />
        <QuotePreview offer={sheet.offer} />
        {open ? null : <ClosedNote known />}
        {sender.error ? <ErrorLine message={sender.error} /> : null}
        {copied === 'failed' ? <ErrorLine message={q.copyFailed} /> : null}
        {copied === 'copied' ? (
          <AppText accessibilityLiveRegion="polite" style={{ ...COPIED, color: color.ok }}>
            {q.copied}
          </AppText>
        ) : null}
        <QuoteActions
          open={open}
          ready={ready}
          sending={sender.pending}
          onSend={() => text && sender.send(text)}
          onEdit={edit}
          onCopy={() => text && void copyOrShare(text).then(setCopied)}
        />
      </ScrollView>
    </ReplySheetFrame>
  );
}
