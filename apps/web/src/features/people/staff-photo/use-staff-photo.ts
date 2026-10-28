import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ChangeEvent } from 'react';
import { accountMessage, avatarFileProblem, PROFILE_KEY } from '@/features/people/account';
import { t } from '@/lib/i18n/i18n';
import { removeStaffPhoto, uploadStaffPhoto, type StaffPhotoTarget } from './api';
import { photoErrorText } from './photo-error';

/** Every list or page that shows staff photos (a teacher is also a login; the admin may be editing their own). */
const PHOTO_KEYS = [
  ['teachers'],
  ['users'],
  ['sales', 'teachers'],
  ['lessons'],
  PROFILE_KEY,
] as const;

/**
 * The admin's photo writes for one teacher / login: a picked file is checked (JPG/PNG/WebP, 2 MB)
 * and uploaded at once; remove asks first (`confirming`). A success refetches every photo query
 * and says so in `notice`; a failure fills `error`.
 */
export function useStaffPhoto(target: StaffPhotoTarget) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const done = async (message: string) => {
    setConfirming(false);
    setNotice(message);
    await Promise.all(PHOTO_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };
  const reset = () => {
    setNotice(null);
    setProblem(null);
  };
  const upload = useMutation({
    mutationFn: (file: File) => uploadStaffPhoto(target, file),
    onMutate: reset,
    onSuccess: () => done(t.staffPhoto.saved),
  });
  const remove = useMutation({
    mutationFn: () => removeStaffPhoto(target),
    onMutate: reset,
    onSuccess: () => done(t.staffPhoto.removed),
  });
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    if (!file) return;
    const code = avatarFileProblem(file);
    if (code) {
      setNotice(null);
      setProblem(accountMessage(code));
    } else upload.mutate(file);
  };
  const failed = upload.error ?? remove.error;
  return {
    pending: upload.isPending ? ('upload' as const) : remove.isPending ? ('remove' as const) : null,
    notice,
    error: problem ?? (failed ? photoErrorText(failed) : null),
    confirming,
    setConfirming,
    pick,
    remove: () => remove.mutate(),
  };
}
