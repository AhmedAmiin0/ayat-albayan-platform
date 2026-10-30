import type { AccountProfile, EmailChange, PasswordChange, ProfileUpdate, SignedUpload } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';

/** «حسابي» (R-ACC-01..05): every /me call acts on the signed-in caller only. */
export const PROFILE_KEY = ['me', 'profile'] as const;

/** GET /me/profile (R-ACC-01): name, email, phone, photo and role of the signed-in user. */
export const profileQuery = queryOptions({
  queryKey: PROFILE_KEY,
  queryFn: () => apiFetch<AccountProfile>('/me/profile'),
  staleTime: 60_000,
  retry: 1,
});

/** PATCH /me/profile (R-ACC-02): the name, or the phone with the current password. */
export const updateProfile = (body: ProfileUpdate) => apiSend<AccountProfile>('PATCH', '/me/profile', body);

/** PUT /me/email (R-ACC-03): confirmed at once; the next sign-in uses the new email. */
export const changeEmail = (body: EmailChange) => apiSend<AccountProfile>('PUT', '/me/email', body);

/** PUT /me/password (R-ACC-04): 204, the session stays. */
export const changePassword = (body: PasswordChange) => apiSend('PUT', '/me/password', body);

/**
 * A photo goes straight to the private `avatars` bucket through a one-off signed URL (same flow as
 * the payment receipt): POST `{base}/upload-url` {mime,size} → upload to it → PUT `{base}` {path}
 * (the API re-checks it). `base` is '/me/avatar' (R-ACC-05) or an admin's '/teachers/:id/avatar' /
 * '/users/:id/avatar' (owner 2026-10-28).
 */
export async function uploadPhoto<T>(base: string, file: File): Promise<T> {
  const signed = await apiSend<SignedUpload>('POST', `${base}/upload-url`, { mime: file.type, size: file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return apiSend<T>('PUT', base, { path: signed.path });
}

/** R-ACC-05: the caller's own photo. */
export const uploadAvatar = (file: File) => uploadPhoto<AccountProfile>('/me/avatar', file);

/** DELETE /me/avatar: back to the initials. */
export const removeAvatar = () => apiSend<AccountProfile>('DELETE', '/me/avatar');
