import type { InvoiceView } from '@ab/schedule';
import { memo, useState } from 'react';
import { Linking, View } from 'react-native';
import { invoiceSubtitle } from '@/finance/invoices/invoice-text';
import { t, type, useTheme, AppText, Button, ErrorLine } from '@ab/mobile-kit';
import { invoiceDownloadUrl } from './money-queries';
import { useViewerTz } from '@/core/lib/clock';

const M = t.mobileStudentFile.money;

/** Opens a fresh signed link in the system viewer; the list's inset card draws fill and rules. */
export const StudentInvoiceRow = memo(function StudentInvoiceRow({
  invoice,
}: {
  invoice: InvoiceView;
}) {
  const tz = useViewerTz();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await Linking.openURL(await invoiceDownloadUrl(invoice.id));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {invoiceSubtitle(invoice, tz)}
      </AppText>
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="secondary" label={M.viewInvoice} busy={busy} onPress={() => void open()} />
      </View>
      {failed ? <ErrorLine message={M.invoiceFailed} /> : null}
    </View>
  );
});
