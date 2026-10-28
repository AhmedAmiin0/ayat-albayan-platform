import type { GoogleEnv } from '../../../../config/env/env';
import type { EventRef, GoogleClient, GoogleClientFactory, GoogleEventBody, GoogleOAuth, Rows, ValueRender, CellValue } from '../google-client.port';
import { GoogleHttp } from './google-http';
import { CalendarApi } from './google-http.calendar';
import { DriveApi } from './google-http.drive';
import { GoogleOAuthApi, oauthClient } from './google-http.oauth';
import { SheetsApi } from './google-http.sheets';

/** The real GoogleClient: Calendar v3, Drive v3, Sheets v4 over google-auth-library's authorised requests. */
export class GoogleHttpClient implements GoogleClient {
  private readonly cal: CalendarApi;
  private readonly drive: DriveApi;
  private readonly sheets: SheetsApi;

  constructor(env: GoogleEnv, refreshToken: string) {
    const auth = oauthClient(env);
    auth.setCredentials({ refresh_token: refreshToken });
    const http = new GoogleHttp(auth, env.endpoints);
    this.cal = new CalendarApi(http);
    this.drive = new DriveApi(http);
    this.sheets = new SheetsApi(http);
  }

  listCalendars = () => this.cal.listCalendars();
  getEvent = (ref: EventRef) => this.cal.getEvent(ref);
  listEvents = (input: { calendarId: string; timeMin: string; timeMax: string }) => this.cal.listEvents(input);
  insertEvent = (input: { calendarId: string; event: GoogleEventBody }) => this.cal.insertEvent(input);
  updateEvent = (input: EventRef & { event: GoogleEventBody }) => this.cal.updateEvent(input);
  deleteEvent = (ref: EventRef) => this.cal.deleteEvent(ref);
  findFiles = (input: { name: string; parentId?: string; mimeType?: string }) => this.drive.findFiles(input);
  getFile = (fileId: string) => this.drive.getFile(fileId);
  createFolder = (input: { name: string; parentId: string }) => this.drive.createFolder(input);
  createSpreadsheet = (input: { name: string; parentId: string }) => this.drive.createSpreadsheet(input);
  uploadPdf = (input: { name: string; parentId: string; bytes: Uint8Array; appProperties: Record<string, string> }) => this.drive.uploadPdf(input);
  updatePdf = (input: { fileId: string; name: string; bytes: Uint8Array }) => this.drive.updatePdf(input);
  readValues = (input: { spreadsheetId: string; range: string; render: ValueRender }): Promise<Rows> => this.sheets.readValues(input);
  appendRow = (input: { spreadsheetId: string; range: string; values: CellValue[] }) => this.sheets.appendRow(input);
  updateValues = (input: { spreadsheetId: string; range: string; values: Rows }) => this.sheets.updateValues(input);
  batchUpdate = (input: { spreadsheetId: string; requests: readonly object[] }) => this.sheets.batchUpdate(input);
}

/** The app's factory: reads the Google env at call time (the client id/secret may change in «التكاملات»). */
export function httpFactory(env: () => GoogleEnv | null): GoogleClientFactory {
  return {
    client(refreshToken: string): GoogleClient {
      const e = env();
      if (!e) throw new Error('google not configured');
      return new GoogleHttpClient(e, refreshToken);
    },
    oauth(): GoogleOAuth | null {
      const e = env();
      return e ? new GoogleOAuthApi(e) : null;
    },
  };
}
