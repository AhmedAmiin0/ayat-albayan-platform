import type { OAuth2Client } from 'google-auth-library';
import type { GoogleEndpoints } from '@/config/env/env';
import { toGoogleError } from '@/modules/platform/google-sync';
import type * as P from './drive-backup.port';
import * as S from './drive-files.schema';

type Options = Parameters<OAuth2Client['request']>[0];
interface Answer {
  data: unknown;
  status: number;
  headers: Headers;
}

/** A chunk (8 MiB) on a slow uplink; a download streams for as long as it takes. */
const CHUNK_TIMEOUT_MS = 180_000;
const DONE_OR_MORE = (status: number): boolean => status < 300 || status === 308;

/**
 * Drive v3 for the backup, over the academy's OAuth2Client (google-auth-library adds the bearer and
 * refreshes it). No retries here (upload.ts retries a chunk); every failure is a GoogleApiError.
 */
export class DriveBackupHttp implements P.DriveBackupApi {
  constructor(
    private readonly auth: OAuth2Client,
    private readonly endpoints: GoogleEndpoints,
  ) {}

  private get files(): string {
    return `${this.endpoints.api}/drive/v3/files`;
  }

  private async call(options: Options): Promise<Answer> {
    try {
      return await this.auth.request<unknown>({ timeout: 30_000, retry: false, ...options });
    } catch (e) {
      throw toGoogleError(e);
    }
  }

  async quota(): Promise<P.DriveQuota> {
    const url = `${this.endpoints.api}/drive/v3/about`;
    const res = await this.call({ url, params: { fields: 'storageQuota,user(emailAddress)' } });
    const { storageQuota: q, user } = S.quotaSchema.parse(res.data);
    return { limit: q.limit ?? null, usage: q.usage, email: user.emailAddress.toLowerCase() };
  }

  async folder(id: string): Promise<P.BackupFile | null> {
    const url = `${this.files}/${encodeURIComponent(id)}`;
    const res = await this.call({ url, params: { fields: S.FILE_FIELDS } }).catch((e: unknown) => {
      if (toGoogleError(e).status === 404) return null;
      throw e;
    });
    const f = res === null ? null : S.oneFileSchema.parse(res.data);
    return f && S.isBackupOwn(f) ? S.toFile(f) : null;
  }

  async findFolders(name: string): Promise<P.BackupFile[]> {
    const q = [
      `name = ${S.lit(name)}`,
      `mimeType = ${S.lit(S.FOLDER_MIME)}`,
      "'root' in parents",
      'trashed = false',
      "appProperties has { key='ab_backup' and value='minio' }",
    ].join(' and ');
    const res = await this.call({
      url: this.files,
      params: { q, fields: `files(${S.FILE_FIELDS})` },
    });
    return S.listSchema.parse(res.data).files.filter(S.isBackupOwn).map(S.toFile);
  }

  async createFolder(name: string): Promise<string> {
    const data = { name, mimeType: S.FOLDER_MIME, parents: ['root'], appProperties: S.BACKUP_MARK };
    const res = await this.call({
      method: 'POST',
      url: this.files,
      data,
      params: { fields: 'id' },
    });
    return S.idSchema.parse(res.data).id;
  }

  async list(folderId: string): Promise<P.BackupFile[]> {
    const out: P.BackupFile[] = [];
    const q = `${S.lit(folderId)} in parents and trashed = false`;
    const fields = `nextPageToken,files(${S.FILE_FIELDS})`;
    let pageToken: string | undefined;
    do {
      const params = { q, fields, pageSize: '1000', ...(pageToken ? { pageToken } : {}) };
      const page = S.listSchema.parse((await this.call({ url: this.files, params })).data);
      out.push(...page.files.map(S.toFile));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return out;
  }

  async startUpload(target: P.UploadTarget): Promise<string> {
    const res = await this.call({
      method: 'POST',
      url: `${this.endpoints.upload}/drive/v3/files`,
      params: { uploadType: 'resumable', fields: 'id' },
      data: { name: target.name, parents: [target.parentId], appProperties: target.appProperties },
      headers: { 'X-Upload-Content-Type': 'application/zstd' },
    });
    return S.idSchema.shape.id.parse(res.headers.get('location'));
  }

  putChunk(input: P.ChunkInput): Promise<P.ChunkResult> {
    const last = input.offset + input.bytes.length - 1;
    const range = `bytes ${input.offset}-${last}/${input.total ?? '*'}`;
    return this.chunk(input.session, { data: input.bytes, headers: { 'Content-Range': range } });
  }

  progress(session: string): Promise<P.ChunkResult> {
    return this.chunk(session, { headers: { 'Content-Range': 'bytes */*' } });
  }

  private async chunk(session: string, options: Options): Promise<P.ChunkResult> {
    const base = { method: 'PUT' as const, url: session, timeout: CHUNK_TIMEOUT_MS };
    const res = await this.call({ ...base, ...options, validateStatus: DONE_OR_MORE });
    if (res.status === 308)
      return { committed: S.committedOf(res.headers.get('range')), fileId: null };
    return { committed: 0, fileId: S.idSchema.parse(res.data).id };
  }

  async setProperties(input: { fileId: string; appProperties: Record<string, string> }) {
    const url = `${this.files}/${encodeURIComponent(input.fileId)}`;
    await this.call({ method: 'PATCH', url, data: { appProperties: input.appProperties } });
  }

  async trash(fileId: string): Promise<void> {
    const url = `${this.files}/${encodeURIComponent(fileId)}`;
    await this.call({ method: 'PATCH', url, data: { trashed: true } });
  }

  async download(fileId: string): Promise<AsyncIterable<Uint8Array>> {
    const url = `${this.files}/${encodeURIComponent(fileId)}`;
    const res = await this.call({
      url,
      params: { alt: 'media' },
      responseType: 'stream',
      timeout: 0,
    });
    return S.streamSchema.parse(res.data);
  }
}
