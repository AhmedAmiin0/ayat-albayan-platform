import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { ChatMediaSheet } from './ChatMediaSheet';
import type { InvoiceDraft } from './contract';
import { InvoiceActions } from './InvoiceActions';
import { InvoicePreview } from './InvoicePreview';
import { useInvoiceUpload } from './use-invoice-upload';

export interface InvoiceStepProps {
  /** The wizard's request id: the upload path is signed for it, and POST /booking sends it too. */
  requestId: string;
  /** The guardian's WhatsApp number: «من الشات» lists what it sent. Absent: no such button. */
  chatPhone?: string | null;
  value: InvoiceDraft | null;
  onChange: (invoice: InvoiceDraft | null) => void;
  onNext: () => void;
}

/**
 * «الفاتورة *»: the payment proof of a package or a makeup, required. From the phone (camera or
 * gallery; a PDF can only come from the chat, which needs no picker module) or «من الشات». The
 * photo uploads the moment it is picked; «التالي» waits for that, and a failed upload (offline
 * included) keeps the photo with «ارفعها تاني», so nothing is picked twice.
 */
export function InvoiceStep({ requestId, chatPhone, value, onChange, onNext }: InvoiceStepProps) {
  const up = useInvoiceUpload(requestId, onChange);
  const [chat, setChat] = useState(false);
  const m = t.booking.mobile;

  if (chat && chatPhone) {
    return (
      <ChatMediaSheet
        phone={chatPhone}
        onClose={() => setChat(false)}
        onPick={(item, thumbnail) => {
          up.clearPending();
          up.setError(null);
          onChange({ source: 'whatsapp', messageId: item.message_id, mime: item.mime, uri: thumbnail });
          setChat(false);
        }}
      />
    );
  }

  const retry = up.pending;
  const shown = value ?? (retry && { uri: retry.uri, mime: retry.mime });
  const caption = value?.source === 'whatsapp' ? t.booking.invoice.fromChat : m.invoiceUploaded;
  return (
    <View style={{ gap: 12 }}>
      <FormLabel>{`${t.booking.invoice.label} *`}</FormLabel>
      <Note>{t.booking.invoice.hint}</Note>
      {shown ? <InvoicePreview uri={shown.uri} mime={shown.mime} caption={caption} /> : null}
      {up.busy ? <Note>{t.booking.invoice.uploading}</Note> : null}
      <InvoiceActions
        picked={value !== null}
        busy={up.busy}
        onPick={(source) => void up.pick(source)}
        onChat={chatPhone ? () => setChat(true) : undefined}
        onRemove={() => onChange(null)}
      />
      {retry && up.error ? (
        <Button variant="ghost" label={m.retryUpload} onPress={() => void up.upload(retry)} />
      ) : null}
      {up.error ? <ErrorLine message={up.error} /> : null}
      <Button
        label={t.booking.next}
        busy={up.busy}
        onPress={() => (value ? onNext() : up.setError(t.booking.error.invoice_required))}
      />
    </View>
  );
}
