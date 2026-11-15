import type { ChangeEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { PhotoPick } from './PhotoPick';

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
 * The photo's buttons (R-ACC-05): «اختيار صورة» (PhotoPick); with a preview «رفع الصورة» (the
 * screen's one filled button) and «إلغاء»; with a saved photo: remove.
 */
export function AvatarActions(p: AvatarActionsProps) {
  const busy = p.pending !== null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PhotoPick label={A.choose} disabled={busy} onPick={p.onPick} />
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
