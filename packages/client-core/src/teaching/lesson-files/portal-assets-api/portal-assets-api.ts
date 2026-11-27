import {
  portalFileUrlSchema,
  portalLessonAssetsSchema,
  portalRecordingsSchema,
  type PortalFileUrl,
  type PortalLessonAssets,
  type PortalRecordings,
} from '@ab/shared';
import type { ApiClient } from '../../../core/http';
import { pathKey } from '../../../core/keys';

// Under the portal's key so the portal's one invalidation refreshes them too.

const enc = encodeURIComponent;
const student = (id: string) => `/portal/students/${enc(id)}`;

interface Read<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  refetchOnWindowFocus: boolean;
}

interface PortalLessonInput {
  studentId: string;
  lessonId: string;
}

interface LessonFileInput {
  studentId: string;
  fileId: string;
  download?: string;
}

const saveAs = (name?: string): string =>
  name ? `?${new URLSearchParams({ download: name }).toString()}` : '';

export interface PortalAssetsApi {
  portalRecordingsQuery: (studentId: string) => Read<PortalRecordings>;
  portalLessonAssetsQuery: (input: PortalLessonInput) => Read<PortalLessonAssets>;
  /** A fresh 1-hour link to one visible lesson file; with `download` it saves under that name. */
  lessonFileUrl: (input: LessonFileInput) => Promise<PortalFileUrl>;
}

export function portalAssetsApi(client: ApiClient): PortalAssetsApi {
  const read = <T>(path: string, schema: { parse: (v: unknown) => T }): Read<T> => ({
    queryKey: pathKey(path),
    queryFn: async () => schema.parse(await client.apiFetch(path)),
    refetchOnWindowFocus: true,
  });
  return {
    portalRecordingsQuery: (studentId) =>
      read(`${student(studentId)}/recordings`, portalRecordingsSchema),
    portalLessonAssetsQuery: ({ studentId, lessonId }) =>
      read(`${student(studentId)}/lessons/${enc(lessonId)}/files`, portalLessonAssetsSchema),
    lessonFileUrl: ({ studentId, fileId, download }) =>
      client
        .apiSend('POST', `${student(studentId)}/lesson-files/${enc(fileId)}/url${saveAs(download)}`)
        .then((r: unknown) => portalFileUrlSchema.parse(r)),
  };
}
