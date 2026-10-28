import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PhotoPick } from '@/features/people/account';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { StaffPhotoKind } from './api';
import { RemoveConfirm } from './RemoveConfirm';
import { useStaffPhoto } from './use-staff-photo';

const P = t.staffPhoto;

export interface StaffPhotoControlProps {
  kind: StaffPhotoKind;
  id: string;
  /** Whose photo: named in the remove confirm. */
  name: string;
  hasPhoto: boolean;
  className?: string;
}

/**
 * The admin's «تغيير الصورة» / «حذف الصورة» beside a staff member's photo (owner 2026-10-28):
 * teachers.write on a teacher, users.write on a staff login; nothing for anyone else. A picked
 * file uploads at once; remove asks first, in place (RemoveConfirm takes focus; on cancel or
 * remove focus returns to «تغيير الصورة»).
 */
export function StaffPhotoControl(props: StaffPhotoControlProps) {
  const allowed = usePermissions().can(`${props.kind}.write`);
  return allowed ? <PhotoButtons {...props} /> : null;
}

/** Focus back on the picker once the confirm closes and the picker is enabled again (never on the first render). */
function useReturnFocus(confirming: boolean, busy: boolean) {
  const picker = useRef<HTMLInputElement>(null);
  const owed = useRef(false);
  useEffect(() => {
    if (confirming) owed.current = true;
    else if (owed.current && !busy) {
      owed.current = false;
      picker.current?.focus();
    }
  }, [confirming, busy]);
  return picker;
}

function PhotoButtons({ kind, id, name, hasPhoto, className }: StaffPhotoControlProps) {
  const photo = useStaffPhoto({ kind, id });
  const busy = photo.pending !== null;
  const picker = useReturnFocus(photo.confirming, busy);
  return (
    <div className={cn('grid gap-2', className)}>
      {photo.confirming ? (
        <RemoveConfirm name={name} pending={photo.pending} onRemove={photo.remove} onCancel={() => photo.setConfirming(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <PhotoPick
            label={photo.pending === 'upload' ? P.uploading : P.change}
            disabled={busy}
            onPick={photo.pick}
            inputRef={picker}
          />
          {hasPhoto && (
            <Button type="button" variant="danger-quiet" disabled={busy} onClick={() => photo.setConfirming(true)}>
              {P.remove}
            </Button>
          )}
        </div>
      )}
      <p className="text-xs text-pretty text-ink-3">{P.hint}</p>
      <p role="status" className="text-xs text-ok empty:hidden">
        {photo.notice}
      </p>
      {photo.error && <FormAlert>{photo.error}</FormAlert>}
    </div>
  );
}
