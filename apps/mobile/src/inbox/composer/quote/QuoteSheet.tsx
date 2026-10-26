import { ActivityIndicator, ScrollView, Share, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { PricingSteps } from '@/finance';
import { ErrorLine } from '../../ErrorLine';
import { ClosedNote } from '../../thread/components/ClosedNote';
import { ReplySheetFrame } from '../../saved-replies/quick-list/ReplySheetFrame';
import { setComposerText, getComposerText } from '../draft-store';
import { QuoteActions } from './QuoteActions';
import { useQuoteSend, useQuoteSheet } from './use-quote-sheet';

interface QuoteSheetProps {
  phone: string;
  /** The 24 h window (thread.session_open): closed → send and edit disabled, copy stays. */
  open: boolean;
  onClose: () => void;
}

/**
 * «عرض سعر» (owner 2026-10-26): the calculator's steps (pills only for the discount), the offer text
 * exactly as «حاسبة الأسعار» copies it, then send it in this chat, put it in the box to edit, or copy
 * it (the share sheet has Copy). Works for a lead with no student; nothing is created.
 */
export function QuoteSheet({ phone, open, onClose }: QuoteSheetProps) {
  const { color } = useTheme();
  const sheet = useQuoteSheet(phone);
  const sender = useQuoteSend(phone, onClose);
  const text = sheet.text;
  const ready = text !== null && !sheet.stale;
  const edit = () => {
    if (!text) return;
    const now = getComposerText(phone).trim();
    setComposerText(phone, now ? `${now}\n${text}` : text);
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
        <QuoteActions
          open={open}
          ready={ready}
          sending={sender.pending}
          onSend={() => text && sender.send(text)}
          onEdit={edit}
          onCopy={() => text && void Share.share({ message: text })}
        />
      </ScrollView>
    </ReplySheetFrame>
  );
}
