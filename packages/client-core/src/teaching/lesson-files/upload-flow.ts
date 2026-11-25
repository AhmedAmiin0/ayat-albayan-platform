import {
  lessonFileUploadSchema,
  type LessonFileKind,
  type LessonFileView,
  type SignedUpload,
} from '@ab/shared';
import type { SlotUploadResult, UploadFile } from '../../core/http';
import type { LessonFilesApi } from './lesson-files-api';

// Checks type and 25 MiB, then slot, upload, register; the picker and upload are the app's.

/** A picked file, whatever picked it. */
export interface PickedFile {
  name: string;
  mime: string;
  size: number;
  body: UploadFile['body'];
}

/** Why a file was refused before it left the device, or why it failed after. */
export type UploadProblem = 'type' | 'too_large' | 'failed';

const PROBLEM_OF: Readonly<Record<string, UploadProblem>> = {
  attachment_type: 'type',
  attachment_too_large: 'too_large',
};

/** null when the file may go; else the reason the screen shows. */
export function pickProblem(file: Pick<PickedFile, 'mime' | 'size'>): UploadProblem | null {
  const parsed = lessonFileUploadSchema.safeParse({ ...file, kind: 'material' });
  if (parsed.success) return null;
  return PROBLEM_OF[parsed.error.issues[0]?.message ?? ''] ?? 'type';
}

/** The name the file keeps on the lesson drops its extension. */
export const titleOf = (name: string): string =>
  (name.replace(/\.[^./]+$/, '').trim() || name).slice(0, 120);

export interface UploadDeps {
  api: Pick<LessonFilesApi, 'uploadUrl' | 'register'>;
  /** The app's slot upload (slotUploader over its supabase-js client). */
  upload: (signed: SignedUpload, file: UploadFile) => Promise<SlotUploadResult>;
}

export interface UploadInput {
  lessonId: string;
  kind: LessonFileKind;
  file: PickedFile;
  visible: boolean;
}

/** Slot, upload, register; throws on any refusal. */
export async function uploadLessonFile(
  deps: UploadDeps,
  input: UploadInput,
): Promise<LessonFileView> {
  const { file, lessonId, kind } = input;
  const meta = lessonFileUploadSchema.parse({ mime: file.mime, size: file.size, kind });
  const signed = await deps.api.uploadUrl({ lessonId, file: meta });
  const { error } = await deps.upload(signed, { body: file.body, contentType: meta.mime });
  if (error) throw error;
  const title = titleOf(file.name);
  const register = { ...meta, path: signed.path, title, visible_to_family: input.visible };
  return deps.api.register({ lessonId, file: register });
}
