// The GoogleClient port (docs/24 §3): every Google call of the sync goes through it. The real
// adapter (google-http.client.ts) speaks the REST APIs; every test uses google-client.fake.ts,
// and e2e points the adapter at tools/google-stub. No test or CI job ever calls Google.

/** A calendar event as the sync writes it (Calendar v3 subset). */
export interface GoogleEventBody {
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: { method: 'popup'; minutes: number }[] };
  extendedProperties: { private: Record<string, string> };
}

/** What an events.get returns that the sync looks at. */
export interface GoogleEvent {
  id: string;
  status: string;
  extendedProperties?: { private?: Record<string, string> };
}

export interface GoogleFileMeta {
  id: string;
  name: string;
  mimeType: string;
  trashed: boolean;
  appProperties: Record<string, string>;
}

export type CellValue = string | number | boolean | null;
export type Rows = CellValue[][];
/** UNFORMATTED (dates as serial numbers) or FORMULA (a =HYPERLINK keeps its URL). */
export type ValueRender = 'UNFORMATTED_VALUE' | 'FORMULA';

export interface EventRef {
  calendarId: string;
  eventId: string;
}

export interface GoogleClient {
  listCalendars(): Promise<{ id: string; summary: string }[]>;
  /** null when the event does not exist (404 / 410). A deleted event may come back with status 'cancelled'. */
  getEvent(ref: EventRef): Promise<GoogleEvent | null>;
  insertEvent(input: { calendarId: string; event: GoogleEventBody }): Promise<{ id: string }>;
  updateEvent(input: EventRef & { event: GoogleEventBody }): Promise<void>;
  deleteEvent(ref: EventRef): Promise<void>;
  /** Not trashed, by exact name; optionally inside one folder and of one mime type. */
  findFiles(input: { name: string; parentId?: string; mimeType?: string }): Promise<GoogleFileMeta[]>;
  getFile(fileId: string): Promise<GoogleFileMeta | null>;
  createFolder(input: { name: string; parentId: string }): Promise<{ id: string }>;
  createSpreadsheet(input: { name: string; parentId: string }): Promise<{ id: string }>;
  uploadPdf(input: { name: string; parentId: string; bytes: Uint8Array; appProperties: Record<string, string> }): Promise<{ id: string }>;
  updatePdf(input: { fileId: string; name: string; bytes: Uint8Array }): Promise<void>;
  readValues(input: { spreadsheetId: string; range: string; render: ValueRender }): Promise<Rows>;
  /** USER_ENTERED (dates become dates); returns the A1 range the row landed in. */
  appendRow(input: { spreadsheetId: string; range: string; values: CellValue[] }): Promise<{ updatedRange: string }>;
  updateValues(input: { spreadsheetId: string; range: string; values: Rows }): Promise<void>;
  batchUpdate(input: { spreadsheetId: string; requests: readonly object[] }): Promise<void>;
}

/** The OAuth half: the consent URL, the code exchange, the account's email, the revoke. */
export interface GoogleOAuth {
  authUrl(input: { state: string; scopes: readonly string[] }): string;
  exchange(code: string): Promise<{ refreshToken: string | null; scopes: string[]; accessToken: string }>;
  email(accessToken: string): Promise<string | null>;
  revoke(refreshToken: string): Promise<void>;
}

/** A Google error, classified by its HTTP status and Google's reason ('invalid_grant', 'rateLimitExceeded', …). */
export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`google ${status} ${reason}`);
  }
}

/** Builds a client for one refresh token (the real adapter, or the fake in tests). */
export interface GoogleClientFactory {
  client(refreshToken: string): GoogleClient;
  oauth(): GoogleOAuth | null;
}
export const GOOGLE_CLIENT_FACTORY = Symbol('GOOGLE_CLIENT_FACTORY');
