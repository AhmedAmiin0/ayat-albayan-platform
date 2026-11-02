import { signInApi } from '@ab/client-core';
import { apiFetch, apiSend } from '@/core/lib/http/api';

/** The public sign-in routes (docs/30 §6) through the mobile API client. */
export const authApi = signInApi({ apiFetch, apiSend });
