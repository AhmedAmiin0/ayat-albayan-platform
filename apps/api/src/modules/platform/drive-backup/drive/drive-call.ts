import type { OAuth2Client } from 'google-auth-library';
import { toGoogleError } from '@/modules/platform/google-sync';

export type Options = Parameters<OAuth2Client['request']>[0];
export interface Answer {
  data: unknown;
  status: number;
  headers: Headers;
}

/** A 404 (not there) as null; any other failure is thrown on. */
export function goneAsNull(e: unknown): null {
  if (toGoogleError(e).status === 404) return null;
  throw e;
}
