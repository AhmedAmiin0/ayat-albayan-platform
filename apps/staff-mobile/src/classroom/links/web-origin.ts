const FALLBACK = 'https://app.ayatalbayan.com';

/**
 * The web app's origin, where the online classroom lives (`/classroom/<lessonId>`). Set
 * `EXPO_PUBLIC_WEB_ORIGIN` at build time; without it the production origin is used. A trailing
 * slash is dropped so a path can be appended.
 */
export function webOrigin(): string {
  const raw = process.env['EXPO_PUBLIC_WEB_ORIGIN']?.trim();
  return (raw ? raw : FALLBACK).replace(/\/+$/, '');
}

/** The web classroom page of a lesson. */
export const classroomUrl = (lessonId: string): string => `${webOrigin()}/classroom/${lessonId}`;

/** The web room of an internal meeting (`/meeting/<id>`). */
export const meetingUrl = (id: string): string => `${webOrigin()}/meeting/${id}`;
