import type { OAuth2Client } from 'google-auth-library';
import { toGoogleError } from '@/modules/platform/google-sync';
import type { Removed, RemoveInput } from './drive-backup.port';
import { isOwnArchive, OWNER_FIELDS, ownerSchema } from './drive-files.schema';

export type Options = Parameters<OAuth2Client['request']>[0];
export interface Answer {
  data: unknown;
  status: number;
  headers: Headers;
}
type Call = (options: Options) => Promise<Answer>;

/** A 404 (already gone) as null; any other failure is thrown on. */
export function goneAsNull(e: unknown): null {
  if (toGoogleError(e).status === 404) return null;
  throw e;
}

/**
 * The permanent delete of one archive (docs/45 §5.1): the file is read first and deleted only when
 * it sits in the backup's folder and carries its marker (`ab_backup=minio`). Never a listing.
 */
export async function removeArchive(call: Call, input: RemoveInput & { files: string }) {
  const url = `${input.files}/${encodeURIComponent(input.fileId)}`;
  const res = await call({ url, params: { fields: OWNER_FIELDS } }).catch(goneAsNull);
  const own = res !== null && isOwnArchive(ownerSchema.parse(res.data), input.folderId);
  const outcome: Removed = res === null ? 'gone' : 'foreign';
  if (!own) return outcome;
  const deleted = await call({ method: 'DELETE', url }).catch(goneAsNull);
  return deleted === null ? 'gone' : 'deleted';
}
