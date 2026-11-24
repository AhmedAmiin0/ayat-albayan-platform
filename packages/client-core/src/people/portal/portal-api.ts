import {
  channelUnreadSchema,
  portalHistorySchema,
  portalHomeSchema,
  portalLessonsSchema,
  portalPackageViewSchema,
  portalReportsSchema,
  reportPageViewSchema,
  type ChannelUnread,
  type PortalHistory,
  type PortalHistoryStatus,
  type PortalHome,
  type PortalLessons,
  type PortalPackageView,
  type PortalReports,
  type ReportPageView,
} from '@ab/shared';
import type { ApiClient } from '../../core/http/index.js';
import { listKey, pathKey } from '../../core/keys/index.js';
import { portalUnreadPath } from '../../messaging/channels/index.js';

// The family portal's reads (docs/31, docs/50 §7), shared by web and the family app: plain TanStack
// Query options (no React), every answer parsed with the shared schema (rule 12). The API scopes
// each student route to the login's own students.

/** The join window turns on by itself: lessons are re-read every 30 seconds. */
export const PORTAL_REFRESH_MS = 30_000;
const ROOT = '/portal';
const enc = encodeURIComponent;
const student = (id: string) => `${ROOT}/students/${enc(id)}`;

/** Every portal query sits under this key: one invalidation refreshes the whole portal. */
export const PORTAL_KEY = pathKey(ROOT);

/** Newest first; the cursor is the last starts_at. */
export interface PortalHistoryPages {
  queryKey: unknown[];
  queryFn: (ctx: { pageParam: string | undefined }) => Promise<PortalHistory>;
  initialPageParam: string | undefined;
  getNextPageParam: (last: PortalHistory) => string | undefined;
  refetchOnWindowFocus: boolean;
}

export interface PortalHistoryInput {
  studentId: string;
  status: PortalHistoryStatus;
}

/** GET …/history: the status always, the cursor only when given. */
export function portalHistoryPath(input: PortalHistoryInput, cursor?: string): string {
  const params = new URLSearchParams({ status: input.status });
  if (cursor) params.set('cursor', cursor);
  return `${student(input.studentId)}/history?${params.toString()}`;
}

/** A plain read: spread into useQuery. */
export interface PortalRead<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  refetchOnWindowFocus: boolean;
}

export interface PortalQueries {
  portalHomeQuery: PortalRead<PortalHome>;
  portalLessonsQuery: (id: string) => PortalRead<PortalLessons> & { refetchInterval: number };
  portalReportsQuery: (studentId: string) => PortalRead<PortalReports>;
  portalPackageQuery: (studentId: string) => PortalRead<PortalPackageView>;
  reportPageByIdQuery: (reportId: string) => PortalRead<ReportPageView> & { retry: false };
  portalHistoryQuery: (input: PortalHistoryInput) => PortalHistoryPages;
  portalUnreadQuery: (studentId: string) => PortalRead<ChannelUnread> & { refetchInterval: number };
}

interface Schema<T> {
  parse: (value: unknown) => T;
}

/** A read of `path`, parsed, keyed by its path segments, re-read when the family comes back. */
function reader(client: ApiClient) {
  return <T>(path: string, schema: Schema<T>): PortalRead<T> => ({
    queryKey: pathKey(path),
    queryFn: async (): Promise<T> => schema.parse(await client.apiFetch(path)),
    refetchOnWindowFocus: true,
  });
}

export function portalQueries(client: ApiClient): PortalQueries {
  const read = reader(client);
  return {
    /** GET /portal/me: the login's kind and students. */
    portalHomeQuery: read(`${ROOT}/me`, portalHomeSchema),
    /** The next 14 days plus prep and this month's counts, re-read every 30 seconds. */
    portalLessonsQuery: (studentId: string) => ({
      ...read(`${student(studentId)}/lessons`, portalLessonsSchema),
      refetchInterval: PORTAL_REFRESH_MS,
    }),
    portalReportsQuery: (studentId: string) =>
      read(`${student(studentId)}/reports`, portalReportsSchema),
    /** A guardian's or an adult's only: a child's login never asks (403 package_guardian_only). */
    portalPackageQuery: (studentId: string) =>
      read(`${student(studentId)}/package`, portalPackageViewSchema),
    /** The report's content (GET /report-pages/by-report/:id): a family reads sent ones only. */
    reportPageByIdQuery: (reportId: string) => ({
      ...read(`/report-pages/by-report/${enc(reportId)}`, reportPageViewSchema),
      retry: false as const,
    }),
    /** The chat badge's unread count, re-read with the lessons. */
    portalUnreadQuery: (studentId: string) => ({
      ...read(portalUnreadPath(studentId), channelUnreadSchema),
      refetchInterval: PORTAL_REFRESH_MS,
    }),
    portalHistoryQuery: (input: PortalHistoryInput): PortalHistoryPages => ({
      queryKey: listKey(`${student(input.studentId)}/history`, { status: input.status }),
      queryFn: async ({ pageParam }) =>
        portalHistorySchema.parse(await client.apiFetch(portalHistoryPath(input, pageParam))),
      initialPageParam: undefined,
      getNextPageParam: (last) => last.next_cursor ?? undefined,
      refetchOnWindowFocus: true,
    }),
  };
}
