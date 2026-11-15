import { AVATAR_MAX_BYTES, AVATAR_MIMES, type AccountError, type AccountProfile } from '@ab/shared';

const MIMES: readonly string[] = AVATAR_MIMES;

/** R-ACC-05, checked before any upload: a JPG/PNG/WebP of at most 2 MB (the API checks again). */
export function avatarFileProblem(file: Pick<File, 'type' | 'size'>): AccountError | null {
  if (!MIMES.includes(file.type)) return 'avatar_type';
  if (file.size > AVATAR_MAX_BYTES) return 'avatar_too_large';
  return null;
}

/** The `accept` of the file input: the same three types. */
export const AVATAR_ACCEPT = AVATAR_MIMES.join(',');

/** The initials' tone seed of the signed-in user: the linked teacher's id (avatar_seed), else the profile's. */
export const avatarSeed = (profile: Pick<AccountProfile, 'id' | 'avatar_seed'> | undefined): string | undefined =>
  profile?.avatar_seed ?? profile?.id;
