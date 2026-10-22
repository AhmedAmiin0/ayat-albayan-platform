// The google-stub's in-memory Google (docs/24 §5): calendars and their events, Drive files and
// one-tab sheets. Fake ids and names only; reset between specs through /__stub/reset.
import type { IncomingMessage } from 'node:http';

export type Cell = string | number | boolean | null;
export interface StubEvent {
  id: string;
  status: string;
  summary: string;
  description: string;
  location: string;
  start: unknown;
  end: unknown;
  extendedProperties?: { private?: Record<string, string> };
}
export interface StubFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  appProperties: Record<string, string>;
  size: number;
}
export interface StubState {
  calendars: Map<string, string>;
  events: Map<string, Map<string, StubEvent>>;
  files: Map<string, StubFile>;
  sheets: Map<string, Cell[][]>;
  /** Every API call: method + path (no token, no body). */
  requests: { method: string; path: string }[];
  /** A refresh token that /token refuses with invalid_grant. */
  revoked: Set<string>;
  seq: number;
}

export type Reply = [number, unknown] | { status: number; location: string };
/** m = the path match, s = the state, url = the request URL. */
export type At = { m: RegExpExecArray; s: StubState; url: URL };
export type Handler = (req: IncomingMessage, at: At) => Promise<Reply>;
export type Route = [method: string, path: RegExp, handler: Handler];

export const FOLDER = 'application/vnd.google-apps.folder';
export const SHEET = 'application/vnd.google-apps.spreadsheet';
export const ROOT_NAME = 'تقارير آيات البيان';
export const SUMMARY_NAME = 'سجل الطلاب المشتركين';
export const SUMMARY_HEADER = ['اسم الطالب', 'المعلمة', 'البرنامج', 'تاريخ أول حلقة', 'آخر حلقة', 'عدد الحلقات', 'مجلد الطالب', 'سجل الحضور'];

export function nextId(s: StubState, prefix: string): string {
  s.seq += 1;
  return `${prefix}${String(s.seq).padStart(14, '0')}`;
}

/** A fresh account: the primary calendar, one teacher calendar, the reports root with the summary sheet. */
export function initialState(): StubState {
  const s: StubState = { calendars: new Map(), events: new Map(), files: new Map(), sheets: new Map(), requests: [], revoked: new Set(), seq: 0 };
  s.calendars.set('primary', 'academy@stub.test');
  s.calendars.set('stub-teacher-cal@group.calendar.google.com', 'آيات البيان — E2E Teacher');
  const root = nextId(s, 'stubRoot');
  s.files.set(root, { id: root, name: ROOT_NAME, mimeType: FOLDER, parents: ['root'], trashed: false, appProperties: {}, size: 0 });
  const summary = nextId(s, 'stubSummary');
  s.files.set(summary, { id: summary, name: SUMMARY_NAME, mimeType: SHEET, parents: [root], trashed: false, appProperties: {}, size: 0 });
  s.sheets.set(summary, [SUMMARY_HEADER]);
  return s;
}

export async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export async function readJson<T>(req: IncomingMessage): Promise<T> {
  const raw = (await readBody(req)).toString('utf8');
  return (raw ? JSON.parse(raw) : {}) as T;
}

export const notFound = (): Reply => [404, { error: { code: 404, status: 'NOT_FOUND', errors: [{ reason: 'notFound' }] } }];
