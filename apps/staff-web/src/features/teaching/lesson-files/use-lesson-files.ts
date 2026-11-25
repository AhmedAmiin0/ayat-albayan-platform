import { LESSON_FILES_KEY, uploadLessonFile, type UploadInput } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSend, openAfter } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { pdfUrl } from '@/features/reporting/reports';
import { lessonFiles } from './api';

/** GET /lessons/:id/files: the lesson's recordings, reports and files (admin, its teacher). */
export const useLessonAssets = (lessonId: string) =>
  useQuery(lessonFiles.lessonAssetsQuery(lessonId));

/** Every lesson-files write refreshes the lesson's page. */
function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: LESSON_FILES_KEY });
}

export function useFileVisibility() {
  return useMutation({ mutationFn: lessonFiles.setVisible, onSuccess: useRefresh() });
}

export function useRemoveFile() {
  return useMutation({ mutationFn: lessonFiles.remove, onSuccess: useRefresh() });
}

export function useRecordingVisibility() {
  return useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      apiSend('PATCH', `/recordings/${encodeURIComponent(id)}/visibility`, { visible }),
    onSuccess: useRefresh(),
  });
}

/** A fresh 1-hour link in a new tab. */
export function useOpenFile() {
  return useMutation({
    mutationFn: (id: string) => openAfter(async () => (await lessonFiles.fileUrl(id)).url),
  });
}

/** Opens the report's signed PDF link in a new tab. */
export function useOpenReportPdf() {
  return useMutation({
    mutationFn: (reportId: string) => openAfter(async () => (await pdfUrl(reportId)).url),
  });
}

/** Slot, upload, register (@ab/client-core uploadLessonFile). */
export function useUploadFile() {
  return useMutation({
    mutationFn: (input: UploadInput) =>
      uploadLessonFile({ api: lessonFiles, upload: uploadSigned }, input),
    onSuccess: useRefresh(),
  });
}
