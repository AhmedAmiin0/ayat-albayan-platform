import type { AuthUser } from '@/common/auth/verify-token';

export const ME_ID = '00000000-0000-4000-8000-000000000001';
export const ME: AuthUser = { id: ME_ID, email: 'old@example.test', role: 'teacher' };
export const PASSWORD = 'Current-pass-1';
