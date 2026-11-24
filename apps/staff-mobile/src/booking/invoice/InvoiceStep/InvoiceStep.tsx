import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine, FormLabel } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { ChatMediaSheet } from '@/booking/invoice/ChatMediaSheet';
import type { InvoiceDraft } from '@/booking/shared/contract';
import { InvoiceActions } from '@/booking/invoice/InvoiceActions';
import { InvoicePreview } from '@/booking/invoice/InvoicePreview';
import { useInvoiceUpload } from '@/booking/invoice/use-invoice-upload';

export interface InvoiceStepProps {
  /** The wizard's request id: the upload path is signed for it, and POST /booking sends it too. */
  requestId: string;
  /** The guardian's WhatsApp number; absent means no from-chat button. */
  chatPhone?: string | null;
  value: InvoiceDraft | null;
  onChange: (invoice: InvoiceDraft | null) => void;
  onNext: () => void;
}

/** Required; uploads on pick, and a failed upload keeps the photo so nothing is picked twice. */
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
      <FormLabel required>{t.booking.invoice.label}</FormLabel>
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
        <Button variant="secondary" label={m.retryUpload} onPress={() => void up.upload(retry)} />
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
