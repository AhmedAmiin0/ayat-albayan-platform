import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { PricingSteps } from '@/finance';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { ClosedNote } from '@/inbox/thread/components/ClosedNote';
import { ReplySheetFrame } from '@/inbox/saved-replies/quick-list/ReplySheetFrame';
import { appendComposerText } from '@/inbox/composer/draft-store';
import { QuoteActions } from './QuoteActions';
import { useQuoteSend, useQuoteSheet } from './use-quote-sheet';

interface QuoteSheetProps {
  phone: string;
  /** A text may go (the composer's rule, owner 2026-11-01): no → send and edit off, copy stays. */
  open: boolean;
  onClose: () => void;
}

/**
 * «عرض سعر» (owner 2026-10-26): the calculator's steps (pills only for the discount), the offer text
 * exactly as «حاسبة الأسعار» copies it, then send it in this chat, put it in the box to edit, or copy
 * it (copyOrShare: the share sheet when the clipboard fails). Works for a lead with no student; nothing is created.
 */
export function QuoteSheet({ phone, open, onClose }: QuoteSheetProps) {
  const { color } = useTheme();
  const sheet = useQuoteSheet(phone);
  const sender = useQuoteSend(phone, onClose);
  // «انسخ»: the clipboard, else the share sheet (it has Copy); a line says how it went.
  const [copied, setCopied] = useState<'copied' | 'shared' | 'failed' | null>(null);
  const text = sheet.text;
  const ready = text !== null && !sheet.stale;
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
        <PricingSteps selection={sheet.selection} onChange={sheet.change} freeDiscount={false} />
        <View style={{ gap: 6 }}>
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink2 }}>{t.inbox.quote.preview}</AppText>
          {text ? (
            <AppText
              testID="quote-preview"
              style={{
                padding: 12, borderRadius: shape.radius.md, borderWidth: 1, borderColor: color.rule, backgroundColor: color.sunk,
                fontFamily: type.ui[400], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink,
                opacity: sheet.stale ? 0.6 : 1,
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
