import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PhotoPick } from '@/features/people/account';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import type { StaffPhotoKind } from './api';
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
 * file uploads at once; remove asks first, in place (the user panel is already a dialog).
 */
export function StaffPhotoControl(props: StaffPhotoControlProps) {
  const allowed = usePermissions().can(`${props.kind}.write`);
  return allowed ? <PhotoButtons {...props} /> : null;
}

function PhotoButtons({ kind, id, name, hasPhoto, className }: StaffPhotoControlProps) {
  const photo = useStaffPhoto({ kind, id });
  const busy = photo.pending !== null;
  return (
    <div className={cn('grid gap-2', className)}>
      {photo.confirming ? (
        <div
          role="group"
          aria-label={P.remove}
          className="grid gap-2 rounded-md border border-rule bg-sunk p-3"
        >
          <p className="text-sm text-pretty text-ink">{P.confirmRemove.replace('{name}', name)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={photo.remove}>
              {photo.pending === 'remove' ? P.removing : P.remove}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => photo.setConfirming(false)}
            >
              {t.common.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <PhotoPick
            label={photo.pending === 'upload' ? P.uploading : P.change}
            disabled={busy}
            onPick={photo.pick}
          />
          {hasPhoto && (
            <Button
              type="button"
              variant="danger-quiet"
              disabled={busy}
              onClick={() => photo.setConfirming(true)}
            >
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
