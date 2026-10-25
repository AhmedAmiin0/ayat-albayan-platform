import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { AttachmentItem } from './AttachmentItem';
import { attachmentRows } from './attachments';
import { usePaymentAttachments } from '../shared/queries';

export interface AttachmentsViewerProps {
  /** The API path to GET: /payments/:id/attachments, or /sales/me/payments/:id/attachments. */
  path: string;
  /** Said after the button's label so a list of them reads apart («عرض المرفقات · هدى»). */
  name: string;
}

/** The opened list: a spinner, the failure, «لا توجد مرفقات», or each file. */
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
  if (!files.data) return <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />;
  const rows = attachmentRows(Array.isArray(files.data) ? files.data : []);
  if (rows.length === 0) {
    return <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink3 }}>{t.payments.noAttachments}</AppText>;
  }
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row) => (
        <AttachmentItem key={row.view.id} row={row} />
      ))}
    </View>
  );
}

/**
 * «عرض المرفقات» of a payment (owner 2026-10-12): the signed URLs are asked only once opened. Bank
 * payments may carry several files; an older one lists its receipt first («الإيصال»).
 */
export function AttachmentsViewer({ path, name }: AttachmentsViewerProps) {
  const [open, setOpen] = useState(false);
  const label = open ? t.mobileMoney.hideAttachments : t.payments.viewAttachments;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={label} accessibilityLabel={`${label} · ${name}`} onPress={() => setOpen((v) => !v)} />
      </View>
      <AttachmentsBody path={path} open={open} />
    </View>
  );
}
