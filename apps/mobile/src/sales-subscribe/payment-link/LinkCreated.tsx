import type { PaymentLinkView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { appendComposerText, chatWindowOpen, ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { instantDay } from '@/payments';
import { fill } from '@/sales';
import { type, useTheme } from '@/theme';
import { agreedLine, linkMessage, referenceLine } from './link-text';

interface LinkCreatedProps {
  link: PaymentLinkView;
  /** The chat the link is for: «إرسال في المحادثة» fills its reply box. */
  phone: string;
  /** Back to the chat once its box holds the text. */
  onSent: () => void;
}

const pl = t.paymentLinks;

/**
 * The link made: the reference vs the agreed amount, the link, then «إرسال في المحادثة» (the text goes into
 * the chat's box for HER to send: never sent for her; within the 24 h window only, else the template note)
 * and «نسخ» (the clipboard, else the share sheet).
 */
export function LinkCreated({ link, phone, onSent }: LinkCreatedProps) {
  const { color } = useTheme();
  const client = useQueryClient();
  const [closed, setClosed] = useState(false);
  const [copy, setCopy] = useState<'copied' | 'shared' | 'failed' | null>(null);
  const send = () => {
    if (!chatWindowOpen(client, phone, new Date())) {
      setClosed(true);
      return;
    }
    // After a reply she had half-written (drafts outlive the chat), never over it.
    appendComposerText(phone, linkMessage(link));
    onSent();
  };
  return (
    <View style={{ gap: 12 }}>
      <Note>{fill(pl.created, { when: instantDay(link.expires_at) })}</Note>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
        {referenceLine(link.reference_price, link.currency)}
      </AppText>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}>
        {agreedLine(link.amount, link.currency)}
      </AppText>
      <AppText selectable style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.lapis }}>
        {ltr(link.url)}
      </AppText>
      {closed ? <ErrorLine message={pl.templateNeeded} /> : null}
      <Button label={pl.sendInChat} onPress={send} />
      <Button variant="secondary" label={pl.copy} onPress={() => void copyOrShare(link.url).then(setCopy)} />
      {copy === 'copied' ? <Note>{pl.copied}</Note> : null}
      {copy === 'failed' ? <ErrorLine message={t.classroom.copyFailed} /> : null}
    </View>
  );
}
