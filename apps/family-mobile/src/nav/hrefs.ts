import type { AlertTarget } from '@ab/client-core';
import { router } from 'expo-router';
import { markReportSeen } from '@/portal';
import { roomHref, roomsInAppNow } from '@/room';

// The family app's pushed screens (outside the tabs group: no tab bar under them, rn-screens#4132).

const enc = encodeURIComponent;

export const childHref = (id: string) => `/child/${enc(id)}` as const;
const packageHref = (studentId: string) => `/package/${enc(studentId)}` as const;
/** A child's chat with the teacher (family_chat_enabled, docs/50 §6). */
export const chatHref = (studentId: string) => `/chat/${enc(studentId)}` as const;
export const ALERTS_HREF = '/alerts';
export const PROFILE_HREF = '/profile';
/** Forced for a guardian with no pick yet, pushed from the account screen to switch. */
export const PICK_HREF = '/pick-child';

interface ReportLink {
  studentId: string;
  reportId: string;
  /** A recording staff made visible to the student, else null. */
  recordingId?: string | null;
}

export function reportHref({ studentId, reportId, recordingId }: ReportLink): string {
  const query = new URLSearchParams({
    student: studentId,
    ...(recordingId && { rec: recordingId }),
  });
  return `/report/${enc(reportId)}?${query.toString()}`;
}

/** Opens a report and marks it opened on this phone so the new mark goes at once. */
export function openReport(link: ReportLink): void {
  markReportSeen(link.reportId);
  router.push(reportHref(link));
}

type Openers = { [K in AlertTarget['screen']]: (t: Extract<AlertTarget, { screen: K }>) => void };

const OPEN: Openers = {
  report: (t) => openReport(t),
  child: (t) => router.push(childHref(t.studentId)),
  package: (t) => router.push(packageHref(t.studentId)),
  chat: (t) => router.push(chatHref(t.studentId)),
  // Lesson-started push goes straight into the room while lessons open in-app, else the child page.
  live: (t) =>
    router.push(roomsInAppNow() ? roomHref({ ...t, direct: true }) : childHref(t.studentId)),
  schedule: () => router.navigate('/schedule'),
};

/** A bell row's target (@ab/client-core alertTarget). */
export function openAlert(target: AlertTarget): void {
  // TypeScript cannot pair a union member with its own key's opener; the map above is checked.
  const open = OPEN[target.screen] as (t: AlertTarget) => void;
  open(target);
}
