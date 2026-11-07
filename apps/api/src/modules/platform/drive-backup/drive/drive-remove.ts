import type { OAuth2Client } from 'google-auth-library';
import { toGoogleError } from '@/modules/platform/google-sync';
import type { Removed, RemoveInput } from './drive-backup.port';
import type { z } from 'zod';
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

type Input = RemoveInput & { files: string };
type Owner = z.infer<typeof ownerSchema>;
const urlOf = (input: Input): string => `${input.files}/${encodeURIComponent(input.fileId)}`;

/** One metadata GET by id (never a listing, which may lag); null: gone (404). */
async function readOwner(call: Call, input: Input): Promise<Owner | null> {
  const params = { fields: `${OWNER_FIELDS},trashed` };
  const res = await call({ url: urlOf(input), params }).catch(goneAsNull);
  return res === null ? null : ownerSchema.parse(res.data);
}

/** The backup's own file in the folder, not trashed. */
export async function archivePresent(call: Call, input: Input): Promise<boolean> {
  const f = await readOwner(call, input);
  return f !== null && !f.trashed && isOwnArchive(f, input.folderId);
}

/** Files left alone, and why: the first that applies. */
const LEAVE: [(f: Owner, input: Input) => boolean, Removed][] = [
  [(f, input) => !isOwnArchive(f, input.folderId), 'foreign'],
  [(f, input) => f.trashed && input.trashedToo !== true, 'kept'],
];

/**
 * The permanent delete of one archive (docs/45 §5.1): the file is read first and deleted only when
 * it sits in the backup's folder and carries its marker (`ab_backup=minio`). Never a listing. One
 * in Drive's trash is deleted only by retention (`trashedToo`): else a person may still restore it.
 */
export async function removeArchive(call: Call, input: Input): Promise<Removed> {
  const f = await readOwner(call, input);
  const left = f === null ? 'gone' : LEAVE.find(([when]) => when(f, input))?.[1];
  if (left !== undefined) return left;
  const deleted = await call({ method: 'DELETE', url: urlOf(input) }).catch(goneAsNull);
  return deleted === null ? 'gone' : 'deleted';
}
