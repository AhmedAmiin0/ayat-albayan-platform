import { chatFileProblem, CHAT_SEND_MIMES } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { sizeText } from '@/features/people/students/recordings/recording-format';
import { t } from '@/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/lib/settings/public-config';
import { chatSendMime } from '../../api/api.files';
import { replyErrorText, uploadReplyFile } from '../lib/api';
import { fileName, type DraftFile } from '../lib/reply-draft';

const S = t.savedReplies;

export interface AttachmentFieldProps {
  file: DraftFile;
  onChange: (file: DraftFile) => void;
  /** An upload is running: the dialog's «حفظ» waits for it. */
  onBusy: (busy: boolean) => void;
}

/** «المرفق (اختياري)»: one JPEG, PNG or PDF within the chat's limits, uploaded as soon as it is picked. */
export function AttachmentField({ file, onChange, onBusy }: AttachmentFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const maxBytes = useUploadMaxBytes();
  const upload = useMutation({
    mutationFn: async (picked: File) => {
      const mime = chatSendMime(picked);
      const problem = chatFileProblem({ mime: mime ?? picked.type, size: picked.size, maxBytes });
      if (problem || !mime) throw new Error(problem ?? 'file_type');
      const path = await uploadReplyFile({ file: picked, mime });
      return { path, attachment: { name: fileName(picked), mime, size: picked.size } };
    },
    onMutate: () => onBusy(true),
    onSettled: () => onBusy(false),
    onSuccess: (done) => onChange({ kind: 'new', ...done }),
  });
  const shown = file.kind === 'none' ? null : file.attachment;
  const problem = upload.error?.message;
  const error = !upload.isError ? null : problem === 'file_type' || problem === 'file_too_large' ? t.inbox.error[problem] : replyErrorText(upload.error);
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-semibold text-ink">{S.attachment}</p>
      {shown && (
        <span className="flex min-w-0 items-center gap-1.5 rounded-md border border-rule bg-sunk px-2 py-1.5 text-xs text-ink-2">
          <Icon name={shown.mime === 'application/pdf' ? 'template' : 'paperclip'} className="size-5" />
          <span className="min-w-0 flex-1 truncate font-semibold" dir="auto">{shown.name}</span>
          <span className="shrink-0 text-ink-3">{sizeText(shown.size)}</span>
        </span>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <Icon name="paperclip" />
          {upload.isPending ? S.attachUploading : shown ? S.attachReplace : S.attach}
        </Button>
        {shown && (
          <Button type="button" size="sm" variant="ghost" disabled={upload.isPending} onClick={() => onChange({ kind: 'none' })}>
            {S.attachRemove}
          </Button>
        )}
      </div>
      <p className="text-xs text-ink-3">{S.attachHint}</p>
      {error && <FormAlert>{error}</FormAlert>}
      <input
        ref={input}
        type="file"
        hidden
        aria-label={S.attach}
        accept={CHAT_SEND_MIMES.join(',')}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = '';
          if (picked) upload.mutate(picked);
        }}
      />
    </div>
  );
}
