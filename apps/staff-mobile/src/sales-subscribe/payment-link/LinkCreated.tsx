import type { PaymentLinkView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t, AppText, Button, ltr, type, useTheme, ErrorLine } from '@ab/mobile-kit';
import { appOpenUrl } from '@/core/lib/stripe-flag';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { appendComposerText, chatMaySend } from '@/inbox';
import { Note } from '@/more';
import { instantDay } from '@/payments';
import { fill } from '@/sales/sales';
import { STRIPE_FEATURE } from './flag';
import { agreedLine, linkMessage, referenceLine } from './link-text';
import { useViewerTz } from '@/core/lib/clock';

interface LinkCreatedProps {
  link: PaymentLinkView;
  /** The chat the link is for; sending fills that chat's reply box. */
  phone: string;
  /** Back to the chat once its box holds the text. */
  onSent: () => void;
}

const pl = t.paymentLinks;

/** The text goes into the chat box for her to send; ?from=<platform> returns her to /pay-done. */
export function LinkCreated({ link, phone, onSent }: LinkCreatedProps) {
  const tz = useViewerTz();
  const base = useTreeBase();
  const course = { pathname: '/inbox/sales-course', params: { studentId: link.student.id } };
  const wizard = inTree(base, course);
  const { color } = useTheme();
  const client = useQueryClient();
  // Read at render, as the web dialog: the button is off (with the box's note) where no text goes.
  const closed = !chatMaySend(client, phone, new Date());
  const [copy, setCopy] = useState<'copied' | 'shared' | 'failed' | null>(null);
  const send = () => {
    // After a reply she had half-written (drafts outlive the chat), never over it.
    appendComposerText(phone, linkMessage(link));
    onSent();
  };
  const [openFailed, setOpenFailed] = useState(false);
  const open = () =>
    void Linking.openURL(appOpenUrl(link.url, STRIPE_FEATURE)).catch(() => setOpenFailed(true));
  return (
    <View style={{ gap: 12 }}>
      <Note>{fill(pl.created, { when: instantDay(link.expires_at, tz) })}</Note>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
        {referenceLine(link.reference_price, link.currency)}
      </AppText>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.base, color: color.ink }}>
        {agreedLine(link.amount, link.currency)}
      </AppText>
      <AppText
        selectable
        style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.lapis }}
      >
        {ltr(link.url)}
      </AppText>
      {closed ? <ErrorLine message={t.inbox.sessionClosed} /> : null}
      <Button label={pl.sendInChat} onPress={send} disabled={closed} />
      <Button variant="secondary" label={pl.copy} onPress={() => void copyOrShare(link.url).then(setCopy)} />
      <Button variant="secondary" label={t.studentLists.openLink} onPress={open} />
      <Button variant="secondary" label={t.courseDraft.pick} onPress={() => router.push(wizard)} />
      {copy === 'copied' ? <Note>{pl.copied}</Note> : null}
      {copy === 'failed' ? <ErrorLine message={t.classroom.copyFailed} /> : null}
      {openFailed ? <ErrorLine message={t.common.error} /> : null}
    </View>
  );
}
