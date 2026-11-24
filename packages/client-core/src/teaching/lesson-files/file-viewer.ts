import type { PortalLessonFile, PortalRecording } from '@ab/shared';

// A voice note never opens in the viewer; it plays in its own player.

/** Zoom of a picture, in percent: from half size to three times, a quarter per step. */
export const ZOOM = { min: 50, max: 300, step: 25, start: 100 } as const;

/** One step in (1) or out (-1), kept between the bounds. */
export const zoomBy = (zoom: number, direction: 1 | -1): number =>
  Math.min(ZOOM.max, Math.max(ZOOM.min, zoom + direction * ZOOM.step));

/** The files the viewer shows: pictures and PDFs, in the list's order. */
export const viewableFiles = <F extends Pick<PortalLessonFile, 'media'>>(
  files: readonly F[],
): F[] => files.filter((file) => file.media !== 'audio');

export interface ViewerPage<F> {
  /** 1-based. */
  number: number;
  total: number;
  prev: F | null;
  next: F | null;
}

/** Where `id` sits among the viewable files, and its neighbours (none past either end). */
export function viewerPage<F extends { id: string }>(
  files: readonly F[],
  id: string,
): ViewerPage<F> {
  const at = files.findIndex((file) => file.id === id);
  return {
    number: at + 1,
    total: files.length,
    prev: files[at - 1] ?? null,
    next: at < 0 ? null : (files[at + 1] ?? null),
  };
}

/** A lesson file's type names its extension, but for these three («audio/mp4» is a voice note). */
const RENAMED: Record<string, string> = { jpeg: 'jpg', mpeg: 'mp3', mp4: 'm4a' };

/** «jpg», «pdf», «m4a» of a picture, a PDF or a sound; none for any other type. */
function extensionOf(mime: string): string | undefined {
  const sub = /^(?:image|audio|application)\/([a-z0-9]+)$/.exec(mime)?.[1];
  return sub && (RENAMED[sub] ?? sub);
}

/** The shown title plus its type's extension. */
export function downloadName(input: { title: string; mime: string }): string {
  const ext = extensionOf(input.mime);
  const base = input.title.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  return ext ? `${base}.${ext}` : base;
}

/** Each lesson's recording ids (all its parts): the list marks the lesson whose part plays. */
export function partIdsByLesson(rows: readonly PortalRecording[]): Map<string, string[]> {
  const ids = new Map<string, string[]>();
  for (const row of rows) ids.set(row.lesson_id, [...(ids.get(row.lesson_id) ?? []), row.id]);
  return ids;
}

/** Some recordings are video (rows from before 2026-10-06): the rows then say which is which. */
export const hasVideo = (rows: readonly Pick<PortalRecording, 'media'>[]): boolean =>
  rows.some((row) => row.media === 'video');
