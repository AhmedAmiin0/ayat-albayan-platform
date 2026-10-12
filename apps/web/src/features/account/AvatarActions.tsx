import { useId, type ChangeEvent } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AVATAR_ACCEPT } from './avatar-file';

const A = t.account.avatar;

export interface AvatarActionsProps {
  /** Which request runs, if any: every button waits for it. */
  pending: 'upload' | 'remove' | null;
  /** A picked file waits for «رفع الصورة». */
  previewing: boolean;
  hasPhoto: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

/**
 * The photo's buttons (R-ACC-05). «اختيار صورة» is the label of the visually hidden file input,
 * drawn as a secondary button; it shows the input's focus ring (peer-focus-visible). With a
 * preview: «رفع الصورة» (the screen's one filled button) and «إلغاء»; with a saved photo: remove.
 */
export function AvatarActions(p: AvatarActionsProps) {
  const inputId = useId();
  const busy = p.pending !== null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input id={inputId} type="file" accept={AVATAR_ACCEPT} className="peer sr-only" disabled={busy} onChange={p.onPick} />
      <label
        htmlFor={inputId}
        className={cn(
          buttonVariants({ variant: 'secondary' }),
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-45',
        )}
      >
        {A.choose}
      </label>
      {p.previewing && (
        <>
          <Button type="button" disabled={busy} onClick={p.onUpload}>
            {p.pending === 'upload' ? A.uploading : A.upload}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={p.onCancel}>
            {t.account.cancel}
          </Button>
        </>
      )}
      {!p.previewing && p.hasPhoto && (
        <Button type="button" variant="danger-quiet" disabled={busy} onClick={p.onRemove}>
          {p.pending === 'remove' ? A.removing : A.remove}
        </Button>
      )}
    </div>
  );
}
