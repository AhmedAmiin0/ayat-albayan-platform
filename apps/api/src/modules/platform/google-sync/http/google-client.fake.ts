import { parseA1 } from '../writers/sheets/a1-range';
import {
  GoogleApiError,
  type CellValue,
  type EventRef,
  type GoogleClient,
  type GoogleClientFactory,
  type GoogleEvent,
  type GoogleEventBody,
  type GoogleFileMeta,
  type GoogleListedEvent,
  type GoogleOAuth,
  type Rows,
} from '../google-client.port';
import { MIME } from '../google-format';

type StoredEvent = GoogleEventBody & { id: string; status: string };
type StoredFile = GoogleFileMeta & { parentId: string | null; bytes?: Uint8Array };

/** In-memory Google for unit tests: calendars, events, Drive files and one-tab sheets, plus a request log. */
export class FakeGoogle implements GoogleClient {
  readonly calendars = new Map<string, string>([['primary', 'academy@example.test']]);
  readonly events = new Map<string, Map<string, StoredEvent>>();
  readonly files = new Map<string, StoredFile>();
  readonly sheets = new Map<string, Rows>();
  readonly log: string[] = [];
  /** The next call of that method throws this error once. */
  readonly failNext = new Map<string, GoogleApiError>();
  private seq = 0;

  private call(method: string, target: string): void {
    this.log.push(`${method} ${target}`);
    const err = this.failNext.get(method);
    if (err) {
      this.failNext.delete(method);
      throw err;
    }
  }
  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}${String(this.seq).padStart(12, '0')}`;
  }
  private cal(calendarId: string): Map<string, StoredEvent> {
    if (!this.calendars.has(calendarId)) throw new GoogleApiError(404, 'notFound');
    const found = this.events.get(calendarId) ?? new Map<string, StoredEvent>();
    this.events.set(calendarId, found);
    return found;
  }

  async listCalendars() {
    this.call('listCalendars', '*');
    return [...this.calendars].map(([id, summary]) => ({ id, summary }));
  }
  async getEvent(ref: EventRef): Promise<GoogleEvent | null> {
    this.call('getEvent', `${ref.calendarId}/${ref.eventId}`);
    return this.cal(ref.calendarId).get(ref.eventId) ?? null;
  }
  async listEvents(input: { calendarId: string; timeMin: string; timeMax: string }): Promise<GoogleListedEvent[]> {
    this.call('listEvents', input.calendarId);
    return [...this.cal(input.calendarId).values()].filter((e) => e.end.dateTime > input.timeMin && e.start.dateTime < input.timeMax);
  }
  async insertEvent(input: { calendarId: string; event: GoogleEventBody }) {
    this.call('insertEvent', input.calendarId);
    const id = this.id('ev');
    this.cal(input.calendarId).set(id, { ...input.event, id, status: 'confirmed' });
    return { id };
  }
  async updateEvent(input: EventRef & { event: GoogleEventBody }) {
    this.call('updateEvent', `${input.calendarId}/${input.eventId}`);
    const cal = this.cal(input.calendarId);
    if (!cal.has(input.eventId)) throw new GoogleApiError(404, 'notFound');
    cal.set(input.eventId, { ...input.event, id: input.eventId, status: 'confirmed' });
  }
  async deleteEvent(ref: EventRef) {
    this.call('deleteEvent', `${ref.calendarId}/${ref.eventId}`);
    if (!this.cal(ref.calendarId).delete(ref.eventId)) throw new GoogleApiError(410, 'deleted');
  }
  async findFiles(input: { name: string; parentId?: string; mimeType?: string }) {
    this.call('findFiles', input.name);
    return [...this.files.values()].filter(
      (f) => !f.trashed && f.name === input.name && (!input.parentId || f.parentId === input.parentId) && (!input.mimeType || f.mimeType === input.mimeType),
    );
  }
  async getFile(fileId: string) {
    this.call('getFile', fileId);
    return this.files.get(fileId) ?? null;
  }
  private add(file: Omit<StoredFile, 'id' | 'trashed'>): { id: string } {
    const id = this.id('file');
    this.files.set(id, { ...file, id, trashed: false });
    return { id };
  }
  async createFolder(input: { name: string; parentId: string }) {
    this.call('createFolder', `${input.parentId}/${input.name}`);
    return this.add({ name: input.name, mimeType: MIME.folder, parentId: input.parentId, appProperties: {} });
  }
  async createSpreadsheet(input: { name: string; parentId: string }) {
    this.call('createSpreadsheet', `${input.parentId}/${input.name}`);
    const made = this.add({ name: input.name, mimeType: MIME.sheet, parentId: input.parentId, appProperties: {} });
    this.sheets.set(made.id, []);
    return made;
  }
  async uploadPdf(input: { name: string; parentId: string; bytes: Uint8Array; appProperties: Record<string, string> }) {
    this.call('uploadPdf', `${input.parentId}/${input.name}`);
    return this.add({ name: input.name, mimeType: MIME.pdf, parentId: input.parentId, appProperties: input.appProperties, bytes: input.bytes });
  }
  async updatePdf(input: { fileId: string; name: string; bytes: Uint8Array }) {
    this.call('updatePdf', input.fileId);
    const f = this.files.get(input.fileId);
    if (!f) throw new GoogleApiError(404, 'notFound');
    this.files.set(input.fileId, { ...f, name: input.name, bytes: input.bytes });
  }
  private sheet(id: string): Rows {
    const s = this.sheets.get(id);
    if (!s) throw new GoogleApiError(404, 'notFound');
    return s;
  }
  async readValues(input: { spreadsheetId: string; range: string }) {
    this.call('readValues', `${input.spreadsheetId}/${input.range}`);
    const r = parseA1(input.range);
    const rows = this.sheet(input.spreadsheetId).slice((r.row ?? 1) - 1, r.endRow ?? undefined);
    return rows.map((row) => row.slice(r.col, r.endCol + 1));
  }
  async appendRow(input: { spreadsheetId: string; range: string; values: CellValue[] }) {
    this.call('appendRow', input.spreadsheetId);
    const rows = this.sheet(input.spreadsheetId);
    rows.push([...input.values]);
    return { updatedRange: `Sheet1!A${rows.length}:M${rows.length}` };
  }
  async updateValues(input: { spreadsheetId: string; range: string; values: Rows }) {
    this.call('updateValues', `${input.spreadsheetId}/${input.range}`);
    const rows = this.sheet(input.spreadsheetId);
    const r = parseA1(input.range);
    input.values.forEach((vals, i) => {
      const at = (r.row ?? 1) - 1 + i;
      const row = rows[at] ?? [];
      vals.forEach((v, j) => (row[r.col + j] = v));
      rows[at] = Array.from(row, (c) => c ?? '');
    });
  }
  async batchUpdate(input: { spreadsheetId: string; requests: readonly object[] }) {
    this.call('batchUpdate', `${input.spreadsheetId}/${input.requests.length}`);
  }
}

/** One FakeGoogle for every token (tests read `google`), and a fake OAuth. */
export function fakeFactory(google = new FakeGoogle(), oauth: GoogleOAuth | null = null): GoogleClientFactory & { google: FakeGoogle } {
  return { google, client: () => google, oauth: () => oauth };
}
