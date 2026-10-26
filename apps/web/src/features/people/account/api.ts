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
 * R-ACC-05: the photo goes straight to the private `avatars` bucket through a one-off signed URL
 * (same flow as the payment receipt), then its path is set on the profile (the API re-checks it).
 */
export async function uploadAvatar(file: File): Promise<AccountProfile> {
  const signed = await apiSend<SignedUpload>('POST', '/me/avatar/upload-url', { mime: file.type, size: file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return apiSend<AccountProfile>('PUT', '/me/avatar', { path: signed.path });
}

/** DELETE /me/avatar: back to the initials. */
export const removeAvatar = () => apiSend<AccountProfile>('DELETE', '/me/avatar');
