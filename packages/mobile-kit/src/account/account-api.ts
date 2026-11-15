import { apiSend } from '../lib/http/api';

// PUT /me/password (R-ACC-04), which every login may call: no body back (204).
export const changePassword = (body: { current_password: string; new_password: string }) =>
  apiSend<undefined>('PUT', '/me/password', body);
