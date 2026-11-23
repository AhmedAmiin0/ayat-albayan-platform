import type { LessonFileKind, LessonFileMedia, LessonFileView } from '@ab/shared';

/** «0.8», «19»: megabytes with one decimal under 10, whole above; at least 0.1. */
export function megabytes(bytes: number): string {
  const mb = Math.max(bytes, 0) / (1024 * 1024);
  const shown = Math.max(mb, 0.1);
  return shown < 10 ? String(Math.round(shown * 10) / 10) : String(Math.round(shown));
}

/** The words a file line needs (the app's t.lessonFiles). */
export interface FileWords {
  kinds: Record<LessonFileKind, string>;
  media: Record<LessonFileMedia, string>;
  sizeMb: string;
}

type FileFacts = Pick<LessonFileView, 'title' | 'kind' | 'media' | 'size'>;

/** Its own title, else the word for its kind. */
export const fileTitleOf = (file: FileFacts, words: FileWords): string =>
  file.title ?? words.kinds[file.kind];

export const fileLineOf = (file: FileFacts, words: FileWords): string =>
  [words.kinds[file.kind], words.media[file.media], words.sizeMb.replace('{n}', megabytes(file.size))]
    .join(' · ');
