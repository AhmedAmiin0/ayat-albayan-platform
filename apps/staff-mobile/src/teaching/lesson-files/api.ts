import { LESSON_FILES_KEY, lessonFilesApi, uploadLessonFile, type UploadInput } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { uploadSigned } from '@/core/lib/http/upload-slot';

// Routes and schemas live in @ab/client-core, which the web binds too.

const api = lessonFilesApi({ apiFetch, apiSend });

// The answer carries 1-hour signed links: `noPersist` keeps them off the disk cache.
const meta = { noPersist: true };

export const useLessonAssets = (lessonId: string) =>
  useQuery({ ...api.lessonAssetsQuery(lessonId), meta });

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LESSON_FILES_KEY });
}

export const useFileVisibility = () =>
  useMutation({ mutationFn: api.setVisible, onSuccess: useRefresh() });

export const useRemoveFile = () => useMutation({ mutationFn: api.remove, onSuccess: useRefresh() });

/** PATCH /recordings/:id/visibility (recording-visibility.service). */
export const useRecordingVisibility = () =>
  useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiSend('PATCH', `/recordings/${encodeURIComponent(id)}/visibility`, { visible }),
    onSuccess: useRefresh(),
  });

/** A picture or a PDF in the phone's viewer, from a fresh 1-hour link. */
export const useOpenFile = () =>
  useMutation({
    mutationFn: async (id: string) => {
      await Linking.openURL((await api.fileUrl(id)).url);
    },
  });

/** Slot, then upload, then register. */
export const useUploadFile = () =>
  useMutation({
    mutationFn: (input: UploadInput) => uploadLessonFile({ api, upload: uploadSigned }, input),
    onSuccess: useRefresh(),
  });
