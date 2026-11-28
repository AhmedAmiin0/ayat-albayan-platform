import { AVATAR_MAX_BYTES, type StaffPhotoView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { pickAvatar } from '@/account/lib/avatar';
import { removeStaffPhoto, staffPhotoError, uploadStaffPhoto } from './staff-photo-api';
import type { StaffPhotoOptions } from './staff-photo.types';

export function useStaffPhoto({ id, calls, photo, invalidate }: StaffPhotoOptions) {
  const target = { id, calls };
  const client = useQueryClient();
  // What the last write answered, until the page reloads; undefined = nothing written here yet.
  const [written, setWritten] = useState<string | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = (message: string) => async (view: StaffPhotoView) => {
    setWritten(view.avatar_url);
    setNotice(message);
    await Promise.all(invalidate.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
  const before = () => {
    setNotice(null);
    setError(null);
  };
  const failed = (e: unknown) => setError(staffPhotoError(e));
  const upload = useMutation({
    mutationFn: uploadStaffPhoto.bind(null, target),
    onMutate: before,
    onSuccess: done(t.staffPhoto.saved),
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: () => removeStaffPhoto(target),
    onMutate: before,
    onSuccess: done(t.staffPhoto.removed),
    onError: failed,
  });

  async function change() {
    before();
    try {
      const picked = await pickAvatar('library');
      if (!picked) return;
      if (picked.size > AVATAR_MAX_BYTES) return setError(t.account.errors.avatar_too_large);
      upload.mutate(picked);
    } catch {
      setError(t.account.errors.permission);
    }
  }
  return {
    photo: written === undefined ? photo : written,
    notice,
    error,
    uploading: upload.isPending,
    removing: remove.isPending,
    change: () => void change(),
    remove: () => remove.mutate(),
  };
}
