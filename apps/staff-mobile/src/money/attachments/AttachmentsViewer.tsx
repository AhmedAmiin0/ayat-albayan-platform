import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { AttachmentItem } from './AttachmentItem';
import { attachmentRows } from './attachments';
import { usePaymentAttachments } from '@/money/shared/queries';

interface AttachmentsViewerProps {
  /** The API path to GET: /payments/:id/attachments, or /sales/me/payments/:id/attachments. */
  path: string;
  /** Read after the button label so a list of them stays distinguishable. */
  name: string;
}

function AttachmentsBody({ path, open }: { path: string; open: boolean }) {
  const { color } = useTheme();
  const files = usePaymentAttachments(path, open);
  if (!open) return null;
  if (files.isError) {
    return (
      <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.bad }}>
        {t.mobileMoney.attachmentsFailed}
      </AppText>
    );
  }
  if (!files.data)
    return <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />;
  const rows = attachmentRows(Array.isArray(files.data) ? files.data : []);
  if (rows.length === 0) {
    return (
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink3 }}>
        {t.payments.noAttachments}
      </AppText>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <AttachmentItem key={row.view.id} row={row} />
      ))}
    </View>
  );
}

/** Signed URLs are requested only once opened; older payments list their receipt first. */
export function AttachmentsViewer({ path, name }: AttachmentsViewerProps) {
  const [open, setOpen] = useState(false);
  const label = open ? t.mobileMoney.hideAttachments : t.payments.viewAttachments;
  return (
    <View style={{ gap: 8 }}>
      <Button variant="secondary" label={label} accessibilityLabel={`${label} · ${name}`} onPress={() => setOpen((v) => !v)} />
      <AttachmentsBody path={path} open={open} />
    </View>
  );
}
