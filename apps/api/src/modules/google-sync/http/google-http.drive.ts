import { randomBytes } from 'node:crypto';
import type { GoogleFileMeta } from '../google-client.port';
import { MIME } from '../google-format';
import type { GoogleHttp } from './google-http';

const FIELDS = 'id,name,mimeType,trashed,appProperties';
type RawFile = { id: string; name: string; mimeType: string; trashed?: boolean; appProperties?: Record<string, string> };
const meta = (f: RawFile): GoogleFileMeta => ({ id: f.id, name: f.name, mimeType: f.mimeType, trashed: f.trashed ?? false, appProperties: f.appProperties ?? {} });
/** A Drive query string literal: backslash and quote escaped. */
const lit = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** multipart/related: the metadata JSON part, then the PDF bytes. */
function multipart(metadata: object, bytes: Uint8Array): { body: Buffer; type: string } {
  const boundary = `ab${randomBytes(12).toString('hex')}`;
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${MIME.pdf}\r\n\r\n`;
  const body = Buffer.concat([Buffer.from(head, 'utf8'), Buffer.from(bytes), Buffer.from(`\r\n--${boundary}--`, 'utf8')]);
  return { body, type: `multipart/related; boundary=${boundary}` };
}

/** Drive v3: find, create folders / spreadsheets, upload and replace the platform's PDFs. */
export class DriveApi {
  constructor(private readonly http: GoogleHttp) {}

  private get files(): string {
    return `${this.http.endpoints.api}/drive/v3/files`;
  }

  async findFiles(input: { name: string; parentId?: string; mimeType?: string }): Promise<GoogleFileMeta[]> {
    const q = [`name = ${lit(input.name)}`, 'trashed = false'];
    if (input.parentId) q.push(`${lit(input.parentId)} in parents`);
    if (input.mimeType) q.push(`mimeType = ${lit(input.mimeType)}`);
    const res = await this.http.send<{ files?: RawFile[] }>({
      method: 'GET',
      url: this.files,
      query: { q: q.join(' and '), fields: `files(${FIELDS})`, pageSize: '50', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' },
    });
    return (res.files ?? []).map(meta);
  }

  async getFile(fileId: string): Promise<GoogleFileMeta | null> {
    const f = await this.http.maybe<RawFile>({ method: 'GET', url: `${this.files}/${encodeURIComponent(fileId)}`, query: { fields: FIELDS, supportsAllDrives: 'true' } });
    return f ? meta(f) : null;
  }

  private create(body: object): Promise<{ id: string }> {
    return this.http.send<{ id: string }>({ method: 'POST', url: this.files, body, query: { fields: 'id', supportsAllDrives: 'true' } });
  }

  createFolder(input: { name: string; parentId: string }): Promise<{ id: string }> {
    return this.create({ name: input.name, mimeType: MIME.folder, parents: [input.parentId], appProperties: { ab_source: 'platform' } });
  }

  createSpreadsheet(input: { name: string; parentId: string }): Promise<{ id: string }> {
    return this.create({ name: input.name, mimeType: MIME.sheet, parents: [input.parentId], appProperties: { ab_source: 'platform' } });
  }

  uploadPdf(input: { name: string; parentId: string; bytes: Uint8Array; appProperties: Record<string, string> }): Promise<{ id: string }> {
    const { body, type } = multipart({ name: input.name, mimeType: MIME.pdf, parents: [input.parentId], appProperties: input.appProperties }, input.bytes);
    return this.http.send<{ id: string }>({
      method: 'POST',
      url: `${this.http.endpoints.upload}/drive/v3/files`,
      query: { uploadType: 'multipart', fields: 'id', supportsAllDrives: 'true' },
      body,
      headers: { 'Content-Type': type },
    });
  }

  async updatePdf(input: { fileId: string; name: string; bytes: Uint8Array }): Promise<void> {
    const { body, type } = multipart({ name: input.name }, input.bytes);
    await this.http.send({
      method: 'PATCH',
      url: `${this.http.endpoints.upload}/drive/v3/files/${encodeURIComponent(input.fileId)}`,
      query: { uploadType: 'multipart', fields: 'id', supportsAllDrives: 'true' },
      body,
      headers: { 'Content-Type': type },
    });
  }
}
