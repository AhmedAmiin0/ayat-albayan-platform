import { attachmentUploadSchema, type ReportAttachmentView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { FormLabel } from '@/payments/FormLabel';
import { pickReceipt, type Receipt } from '@/payments/receipt';
import { openIcon } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';
import { openSigned, reportErrorText, uploadAttachment } from '@/teacher/report/hooks/api';

export interface AttachmentsFieldProps {
  reportId: string;
  files: ReportAttachmentView[];
  onChange: (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) => void;
  /** canEditReport: adding closes with the edit window. */
  editable: boolean;
  /** The add button's word (default «اختر صورة»). */
  addLabel?: string;
}

/** صورة / ملف PDF / تسجيل صوتي and its size in MB (one decimal, Western digits), as on the web. */
export function fileLabel(file: Pick<ReportAttachmentView, 'mime' | 'size'>): string {
  const kind = file.mime === 'application/pdf' ? 'pdf' : file.mime.startsWith('audio/') ? 'audio' : 'image';
  const mb = t.reports.sizeMb.replace('{n}', Math.max(0.1, file.size / 1_048_576).toFixed(1));
  return `${t.reports.fileKind[kind]} · ${mb}`;
}

const ERRORS: Record<string, string> = t.reports.error;

/**
 * «المرفقات (اختياري)» (R-REP-02): each file opens through a signed URL; a photo from the gallery
 * (the system picker, no permission) goes up as its bytes, then is registered on the report.
 * ponytail: photos only on the phone; PDF / audio need expo-document-picker in the next APK.
 */
export function AttachmentsField({ reportId, files, onChange, editable, addLabel }: AttachmentsFieldProps) {
  const [local, setLocal] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: (file: Receipt) => uploadAttachment(reportId, file),
    onSuccess: (file) => onChange((list) => [...list, file]),
  });
  const add = async () => {
    setLocal(null);
    const picked = await pickReceipt('library').catch(() => null);
    if (!picked) return;
    const check = attachmentUploadSchema.safeParse({ mime: picked.mime, size: picked.size });
    if (check.success) upload.mutate(picked);
    else setLocal(ERRORS[check.error.issues[0]?.message ?? ''] ?? t.common.error);
  };
  const error = local ?? (upload.error ? reportErrorText(upload.error) : null);
  return (
    <View accessibilityLabel={t.reports.attachments} style={{ gap: 8 }}>
      <FormLabel>{t.reports.attachments}</FormLabel>
      {files.map((f) => (
        <Button
          key={f.id}
          variant="secondary"
          icon={openIcon}
          label={`${fileLabel(f)} · ${t.reports.openFile}`}
          onPress={() => void openSigned(`/reports/${reportId}/attachments/${f.id}/url`).catch(() => setLocal(t.common.error))}
        />
      ))}
      {editable ? (
        <>
          <Button
            variant="secondary"
            label={upload.isPending ? t.reports.uploading : (addLabel ?? t.payments.mobile.pickPhoto)}
            busy={upload.isPending}
            onPress={() => void add()}
          />
          <Note>{t.reports.mobileAttachHint}</Note>
        </>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
