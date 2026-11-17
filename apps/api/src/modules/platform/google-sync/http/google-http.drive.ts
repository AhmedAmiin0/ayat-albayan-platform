import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import type { GoogleFileMeta } from '@/modules/platform/google-sync/google-client.port';
import { MIME } from '@/modules/platform/google-sync/google-format';
import { createdAnswer, fileAnswer, filesAnswer, ignoredAnswer } from './google-answers';
import type { GoogleHttp } from './google-http';

const FIELDS = 'id,name,mimeType,trashed,appProperties';
const ALL_DRIVES = { supportsAllDrives: 'true' };
const UPLOAD = { uploadType: 'multipart', fields: 'id', ...ALL_DRIVES };
const PLATFORM = { ab_source: 'platform' };

const meta = (f: z.infer<typeof fileAnswer>): GoogleFileMeta => ({
  id: f.id,
  name: f.name,
  mimeType: f.mimeType,
  trashed: f.trashed ?? false,
  appProperties: f.appProperties ?? {},
});

/** A Drive query string literal: backslash and quote escaped. */
const lit = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

interface Part {
  boundary: string;
  metadata: object;
}

const partsHead = (p: Part): string =>
  `--${p.boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
  `${JSON.stringify(p.metadata)}\r\n--${p.boundary}\r\nContent-Type: ${MIME.pdf}\r\n\r\n`;

/** multipart/related: the metadata JSON part, then the PDF bytes. */
function multipart(metadata: object, bytes: Uint8Array) {
  const boundary = `ab${randomBytes(12).toString('hex')}`;
  const raw = Buffer.concat([
    Buffer.from(partsHead({ boundary, metadata }), 'utf8'),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`, 'utf8'),
  ]);
  return { raw, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` } };
}

interface FileQuery {
  name: string;
  parentId?: string;
  mimeType?: string;
}

const queryOf = (input: FileQuery): string =>
  [
    `name = ${lit(input.name)}`,
    'trashed = false',
    ...(input.parentId ? [`${lit(input.parentId)} in parents`] : []),
    ...(input.mimeType ? [`mimeType = ${lit(input.mimeType)}`] : []),
  ].join(' and ');

interface NewItem {
  name: string;
  parentId: string;
}

/** A folder or a spreadsheet the platform made (its tag). */
const platformItem = (input: NewItem, mimeType: string) => ({
  name: input.name,
  mimeType,
  parents: [input.parentId],
  appProperties: PLATFORM,
});

interface NewPdf {
  name: string;
  parentId: string;
  bytes: Uint8Array;
  appProperties: Record<string, string>;
}

/** Drive v3: find, create folders / spreadsheets, upload and replace the platform's PDFs. */
export class DriveApi {
  constructor(private readonly http: GoogleHttp) {}

  private get files(): string {
    return `${this.http.endpoints.api}/drive/v3/files`;
  }

  private get uploads(): string {
    return `${this.http.endpoints.upload}/drive/v3/files`;
  }

  async findFiles(input: FileQuery): Promise<GoogleFileMeta[]> {
    const query = {
      q: queryOf(input),
      fields: `files(${FIELDS})`,
      pageSize: '50',
      ...ALL_DRIVES,
      includeItemsFromAllDrives: 'true',
    };
    const res = await this.http.send({ path: this.files, query, schema: filesAnswer });
    return (res.files ?? []).map(meta);
  }

  async getFile(fileId: string): Promise<GoogleFileMeta | null> {
    const path = `${this.files}/${encodeURIComponent(fileId)}`;
    const query = { fields: FIELDS, ...ALL_DRIVES };
    const f = await this.http.maybe({ path, query, schema: fileAnswer });
    return f ? meta(f) : null;
  }

  private async create(json: object): Promise<{ id: string }> {
    const query = { fields: 'id', ...ALL_DRIVES };
    const res = await this.http.send({
      method: 'POST',
      path: this.files,
      json,
      query,
      schema: createdAnswer,
    });
    return { id: res.id };
  }

  createFolder(input: NewItem): Promise<{ id: string }> {
    return this.create(platformItem(input, MIME.folder));
  }

  createSpreadsheet(input: NewItem): Promise<{ id: string }> {
    return this.create(platformItem(input, MIME.sheet));
  }

  async uploadPdf(input: NewPdf): Promise<{ id: string }> {
    const { name, appProperties } = input;
    const metadata = { name, mimeType: MIME.pdf, parents: [input.parentId], appProperties };
    const { raw, headers } = multipart(metadata, input.bytes);
    const call = { method: 'POST', path: this.uploads, query: UPLOAD, raw, headers } as const;
    const res = await this.http.send({ ...call, schema: createdAnswer });
    return { id: res.id };
  }

  async updatePdf(input: { fileId: string; name: string; bytes: Uint8Array }): Promise<void> {
    const { raw, headers } = multipart({ name: input.name }, input.bytes);
    const path = `${this.uploads}/${encodeURIComponent(input.fileId)}`;
    const call = { method: 'PATCH', path, query: UPLOAD, raw, headers } as const;
    await this.http.send({ ...call, schema: ignoredAnswer });
  }
}
