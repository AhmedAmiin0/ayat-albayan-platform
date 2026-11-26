import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t, shape, type, useTheme, AppText, ErrorState, ErrorLine } from '@ab/mobile-kit';
import { PricingSteps } from '@/finance';
import { CustomAmountPill } from '@/payments';
import { CustomPriceField } from '@/subscribe';
import { ClosedNote } from '@/inbox/thread/components/ClosedNote';
import { ReplySheetFrame } from '@/inbox/saved-replies/quick-list/ReplySheetFrame';
import { appendComposerText } from '@/inbox/composer/draft-store';
import { QuoteActions } from '@/inbox/composer/quote/QuoteActions';
import { useQuoteSend, useQuoteSheet } from '@/inbox/composer/quote/use-quote-sheet';

interface QuoteSheetProps {
  phone: string;
  /** A text may go (the composer's rule): no → send and edit off, copy stays. */
  open: boolean;
  onClose: () => void;
}

/** Works for a lead with no student; nothing is created. */
export function QuoteSheet({ phone, open, onClose }: QuoteSheetProps) {
  const { color } = useTheme();
  const sheet = useQuoteSheet(phone);
  const sender = useQuoteSend(phone, onClose);
  // Copy falls back to the share sheet when the clipboard fails.
  const [copied, setCopied] = useState<'copied' | 'shared' | 'failed' | null>(null);
  const text = sheet.text;
  // An invalid custom amount blocks sending, like a stale price.
  const held = sheet.stale || sheet.invalid;
  const ready = text !== null && !held;
  const edit = () => {
    if (!text) return;
    appendComposerText(phone, text);
    onClose();
  };
  return (
    <ReplySheetFrame onClose={() => !sender.pending && onClose()} tall>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 32 }}>
        <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: type.lineHeight(type.size.lg), color: color.ink }}>
          {t.inbox.quote.title}
        </AppText>
        <PricingSteps
          selection={sheet.selection}
          onChange={sheet.change}
          freeDiscount={false}
          discountExtra={<CustomAmountPill on={sheet.custom.on} onChange={sheet.custom.setOn} />}
        />
        <CustomPriceField price={sheet.custom} />
        <View style={{ gap: 6 }}>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>
            {t.inbox.quote.preview}
          </AppText>
          {text ? (
            <AppText
              testID="quote-preview"
              style={{
                padding: 12,
                borderRadius: shape.radius.md,
                borderWidth: 1,
                borderColor: color.rule,
                backgroundColor: color.sunk,
                fontFamily: type.ui[400],
                fontSize: type.size.body,
                lineHeight: type.lineHeight(type.size.body),
                color: color.ink,
                opacity: held ? 0.6 : 1,
              }}
            >
              {text}
            </AppText>
          ) : sheet.quote.isError ? (
            <ErrorState onRetry={() => void sheet.quote.refetch()} />
          ) : (
            <ActivityIndicator color={color.lapis} />
          )}
        </View>
        {open ? null : <ClosedNote known />}
        {sender.error ? <ErrorLine message={sender.error} /> : null}
        {copied === 'failed' ? <ErrorLine message={t.inbox.quote.copyFailed} /> : null}
        {copied === 'copied' ? (
          <AppText accessibilityLiveRegion="polite" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ok }}>
            {t.inbox.quote.copied}
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
