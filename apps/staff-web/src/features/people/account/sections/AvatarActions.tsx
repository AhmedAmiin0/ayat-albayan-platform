import type { ChangeEvent } from 'react';
import { Button, t } from '@ab/web-kit';
import { PhotoPick } from './PhotoPick';

const A = t.account.avatar;

export interface AvatarActionsProps {
  /** Which request runs, if any: every button waits for it. */
  pending: 'upload' | 'remove' | null;
  previewing: boolean;
  hasPhoto: boolean;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

/** R-ACC-05: upload is the screen's one filled button. */
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
