import { useMutation, useQuery } from '@tanstack/react-query';
import { portalApi, portalAssets } from '@ab/web-kit/portal/api';

/** A signed link lasts an hour; it is minted again after 50 minutes. */
const LINK_FRESH_MS = 50 * 60_000;

export const useChildRecordings = (studentId: string) =>
  useQuery(portalAssets.portalRecordingsQuery(studentId));

export const usePortalLesson = (input: { studentId: string; lessonId: string }) =>
  useQuery(portalAssets.portalLessonAssetsQuery(input));

/** The recording's link for the in-page player. */
export const useRecordingUrl = (input: { studentId: string; recordingId: string }) =>
  useQuery({
    queryKey: ['portal-recording-url', input.studentId, input.recordingId],
    queryFn: () => portalApi.fileUrl({ studentId: input.studentId, kind: 'recordings', id: input.recordingId }),
    staleTime: LINK_FRESH_MS,
  });

/** A voice note's link for the in-page player. */
export const useLessonFileUrl = (input: { studentId: string; fileId: string }) =>
  useQuery({
    queryKey: ['portal-lesson-file-url', input.studentId, input.fileId],
    queryFn: () => portalAssets.lessonFileUrl(input),
    staleTime: LINK_FRESH_MS,
  });

/** Content-Disposition: attachment, so the page stays while the browser saves. */
export function useSaveLessonFile(studentId: string) {
  return useMutation({
    mutationFn: async (input: { fileId: string; name: string }) => {
      const { fileId, name } = input;
      const link = await portalAssets.lessonFileUrl({ studentId, fileId, download: name });
      window.location.assign(link.url);
    },
  });
}
