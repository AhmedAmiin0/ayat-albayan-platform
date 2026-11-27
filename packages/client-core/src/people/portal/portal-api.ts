import { routePath } from '@ab/core';
import {
  channelUnreadSchema,
  portalRoutes,
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
import { callWith, type ApiClient } from '../../core/http';
import { listKey, pathKey } from '../../core/keys';
import { portalUnreadPath } from '../../messaging/channels';

// The family portal's reads (docs/31, docs/50 §7), shared by web and the family app: plain TanStack
// Query options (no React), every answer parsed with the shared schema (rule 12). The API scopes
// each student route to the login's own students.

/** The join window turns on by itself: lessons are re-read every 30 seconds. */
export const PORTAL_REFRESH_MS = 30_000;
const ROOT = '/portal';
const enc = encodeURIComponent;

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

/** A route read under its own path's key, re-read when the family comes back. */
const keyed = <T>(path: string, queryFn: () => Promise<T>): PortalRead<T> => ({
  queryKey: pathKey(path),
  queryFn,
  refetchOnWindowFocus: true,
});

export function portalQueries(client: ApiClient): PortalQueries {
  const read = reader(client);
  const call = callWith(client);
  const of = (studentId: string) => ({ id: studentId });
  return {
    /** GET /portal/me: the login's kind and students. */
    portalHomeQuery: keyed(portalRoutes.home.path, () => call({ route: portalRoutes.home })),
    /** The next 14 days plus prep and this month's counts, re-read every 30 seconds. */
    portalLessonsQuery: (studentId: string) => ({
      ...keyed(routePath(portalRoutes.lessons, of(studentId)), () =>
        call({ route: portalRoutes.lessons, params: of(studentId) }),
      ),
      refetchInterval: PORTAL_REFRESH_MS,
    }),
    portalReportsQuery: (studentId: string) =>
      keyed(routePath(portalRoutes.reports, of(studentId)), () =>
        call({ route: portalRoutes.reports, params: of(studentId) }),
      ),
    /** A guardian's or an adult's only: a child's login never asks (403 package_guardian_only). */
    portalPackageQuery: (studentId: string) =>
      keyed(routePath(portalRoutes.package, of(studentId)), () =>
        call({ route: portalRoutes.package, params: of(studentId) }),
      ),
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
      queryKey: listKey(routePath(portalRoutes.history, of(input.studentId)), {
        status: input.status,
      }),
      queryFn: ({ pageParam }) =>
        call({
          route: portalRoutes.history,
          params: of(input.studentId),
          query: { status: input.status, cursor: pageParam },
        }),
      initialPageParam: undefined,
      getNextPageParam: (last) => last.next_cursor ?? undefined,
      refetchOnWindowFocus: true,
    }),
  };
}
