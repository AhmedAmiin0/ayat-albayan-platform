import { Readable } from 'node:stream';
import { z } from 'zod';
import type { BackupFile } from './drive-backup.port';

// What Drive v3 answers (zod at the boundary, rule 12): only the fields the backup reads.

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** The marker on everything the backup creates: its own folder and archives only. */
export const BACKUP_MARK = { ab_source: 'platform', ab_backup: 'minio' } as const;
export const FILE_FIELDS = 'id,name,size,createdTime,trashed,appProperties';

const fileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  size: z.coerce.number().int().nonnegative().optional(),
  createdTime: z.string().optional(),
  trashed: z.boolean().optional(),
  appProperties: z.record(z.string(), z.string()).optional(),
});
type RawFile = z.infer<typeof fileSchema>;

export const listSchema = z.object({
  files: z.array(fileSchema).default([]),
  nextPageToken: z.string().optional(),
});
export const oneFileSchema = fileSchema;
export const idSchema = z.object({ id: z.string().min(1) });
export const quotaSchema = z.object({
  storageQuota: z.object({
    limit: z.coerce.number().optional(),
    usage: z.coerce.number().default(0),
  }),
  user: z.object({ emailAddress: z.string().min(3) }),
});

/** A download (responseType stream): a Node stream of bytes. */
export const streamSchema = z.custom<AsyncIterable<Uint8Array>>((v) => v instanceof Readable);

export const toFile = (f: RawFile): BackupFile => ({
  id: f.id,
  name: f.name,
  size: f.size ?? 0,
  createdTime: f.createdTime ?? '',
  appProperties: f.appProperties ?? {},
});

/** The backup's own: carries the marker (a same-named folder of someone else is never used). */
export const isBackupOwn = (f: RawFile): boolean =>
  f.trashed !== true && f.appProperties?.ab_backup === BACKUP_MARK.ab_backup;

/** What the permanent delete checks first: the parents and the marker. */
export const OWNER_FIELDS = 'id,parents,appProperties';
export const ownerSchema = z.object({
  parents: z.array(z.string()).default([]),
  appProperties: z.record(z.string(), z.string()).optional(),
});

/** An archive the backup itself made, in its own folder: the only files it ever deletes. */
export const isOwnArchive = (f: z.infer<typeof ownerSchema>, folderId: string): boolean =>
  f.appProperties?.ab_backup === BACKUP_MARK.ab_backup && f.parents.includes(folderId);

/** A Drive query string literal: backslash and quote escaped. */
export const lit = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** «bytes=0-N» (a 308's Range) → N + 1; no header → 0. */
export function committedOf(range: string | null): number {
  const m = /bytes=0-(\d+)/.exec(range ?? '');
  return m ? Number(m[1]) + 1 : 0;
}
