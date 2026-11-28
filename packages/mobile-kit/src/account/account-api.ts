import { accountCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '../lib/http/api';

export const { changePassword } = accountCalls({ apiFetch, apiSend });
