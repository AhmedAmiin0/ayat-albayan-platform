import type { InvoiceView } from '@ab/shared';
import { memo, useState } from 'react';
import { Linking, View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { invoiceSubtitle } from '@/finance/invoices/invoice-text';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { invoiceDownloadUrl } from './money-queries';

const M = t.mobileStudentFile.money;

/** One invoice (day · kind · source) with «فتح الفاتورة»: a fresh signed link in the system viewer. */
export const StudentInvoiceRow = memo(function StudentInvoiceRow({ invoice }: { invoice: InvoiceView }) {
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
    <View style={{ gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }}>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {invoiceSubtitle(invoice)}
      </AppText>
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="secondary" label={M.viewInvoice} busy={busy} onPress={() => void open()} />
      </View>
      {failed ? <ErrorLine message={M.invoiceFailed} /> : null}
    </View>
  );
});
