import { ATTACHMENT_MIMES, attachmentUploadSchema, type ReportAttachmentView } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n';
import { attachmentUrl, removeAttachment, reportErrorText, uploadAttachment } from './api';

export interface AttachmentsFieldProps {
  reportId: string;
  files: ReportAttachmentView[];
  onChange: (next: (files: ReportAttachmentView[]) => ReportAttachmentView[]) => void;
  /** canEditReport: adding and removing close with the edit window. */
  editable: boolean;
}

/** صورة / ملف PDF / تسجيل صوتي and its size in MB (one decimal, Western digits). */
export function fileLabel(file: Pick<ReportAttachmentView, 'mime' | 'size'>): string {
  const kind = file.mime === 'application/pdf' ? 'pdf' : file.mime.startsWith('audio/') ? 'audio' : 'image';
  const mb = t.reports.sizeMb.replace('{n}', Math.max(0.1, file.size / 1_048_576).toFixed(1));
  return `${t.reports.fileKind[kind]} · ${mb}`;
}

/** «المرفقات (اختياري)» (R-REP-02): signed upload to Storage, then registered on the report. */
export function AttachmentsField({ reportId, files, onChange, editable }: AttachmentsFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: uploadAttachment,
    onSuccess: (file) => onChange((list) => [...list, file]),
  });
  const remove = useMutation({
    mutationFn: removeAttachment,
    onSuccess: (_v, { attachmentId }) => onChange((list) => list.filter((f) => f.id !== attachmentId)),
  });
  const pick = (file: File | undefined) => {
    if (!file) return;
    const check = attachmentUploadSchema.safeParse({ mime: file.type, size: file.size });
    setLocal(check.success ? null : (check.error.issues[0]?.message ?? 'attachment_type'));
    if (check.success) upload.mutate({ id: reportId, file });
    if (input.current) input.current.value = '';
  };
  const open = async (attachmentId: string) => {
    const { url } = await attachmentUrl({ id: reportId, attachmentId });
    window.open(url, '_blank', 'noopener');
  };
  const error = local ? (t.reports.error as Record<string, string>)[local] : upload.error ?? remove.error;

  return (
    <section aria-label={t.reports.attachments} className="grid gap-2">
      <h3 className="text-sm font-semibold text-ink-2">{t.reports.attachments}</h3>
      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-2">{fileLabel(f)}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => void open(f.id)}>
                {t.reports.openFile}
              </Button>
              {editable && (
                <Button type="button" variant="danger-quiet" size="sm" disabled={remove.isPending} onClick={() => remove.mutate({ id: reportId, attachmentId: f.id })}>
                  {t.reports.removeAttachment}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-3">
          <input ref={input} type="file" accept={ATTACHMENT_MIMES.join(',')} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
          <Button type="button" variant="secondary" disabled={upload.isPending} onClick={() => input.current?.click()}>
            {upload.isPending ? t.reports.uploading : t.reports.attach}
          </Button>
          <span className="text-xs text-ink-3">{t.reports.attachmentHint}</span>
        </div>
      )}
      {error && <FormAlert>{typeof error === 'string' ? error : reportErrorText(error)}</FormAlert>}
    </section>
  );
}
