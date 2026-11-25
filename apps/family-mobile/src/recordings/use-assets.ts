import { offPathKeys } from '@ab/client-core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { useScreenFocused } from '@ab/mobile-kit';
import { portalSend } from '@/portal';
import { assets } from './api';

/** A signed link lasts an hour; it is minted again after 50 minutes. */
const LINK_FRESH_MS = 50 * 60_000;
/** A signed link expires: never on the disk cache (a restart would replay a dead link). */
const meta = { noPersist: true };

export function useChildRecordings(studentId: string) {
  return useQuery({ ...assets.portalRecordingsQuery(studentId), subscribed: useScreenFocused() });
}

export function useLessonAssets(input: { studentId: string; lessonId: string }) {
  return useQuery({ ...assets.portalLessonAssetsQuery(input), subscribed: useScreenFocused() });
}

/** The recording's signed link for the in-app player (1 hour). */
export function useRecordingUrl(input: { studentId: string; recordingId: string }) {
  return useQuery({
    queryKey: offPathKeys.portalRecordingUrl(input.studentId, input.recordingId),
    queryFn: () => portalSend.fileUrl({ ...input, kind: 'recordings', id: input.recordingId }),
    staleTime: LINK_FRESH_MS,
    meta,
  });
}

/** A voice note's signed link for the in-app player. */
export function useLessonFileUrl(input: { studentId: string; fileId: string }) {
  return useQuery({
    queryKey: offPathKeys.portalLessonFileUrl(input.studentId, input.fileId),
    queryFn: () => assets.lessonFileUrl(input),
    staleTime: LINK_FRESH_MS,
    meta,
  });
}

/** A picture or a PDF opens in the phone's viewer from a fresh link. */
export function useOpenLessonFile(studentId: string) {
  return useMutation({
    mutationFn: async (fileId: string) => {
      await Linking.openURL((await assets.lessonFileUrl({ studentId, fileId })).url);
    },
  });
}
