import { PROGRAMS, type Program } from '@ab/shared';
import type { Href } from 'expo-router';

export interface TrialDateTarget {
  studentId: string;
  name: string;
  /** The teacher filter's start; the sales family view knows none (quran then). */
  program?: Program;
}

const params = (s: TrialDateTarget) => ({ studentId: s.studentId, name: s.name, ...(s.program ? { program: s.program } : {}) });

/** From the admin student file: its own screen in the Students tab's stack. */
export function studentFileTrialHref(s: TrialDateTarget): Href {
  return { pathname: '/students/trial-date/[studentId]', params: params(s) };
}

/**
 * From a chat: inside the chat's own route group, beside its book route (/inbox/book), so the chat
 * stays a full screen with no tab bar under it. Move it into the tree with inTree.
 */
export function chatTrialHref(s: TrialDateTarget): Href {
  return { pathname: '/inbox/trial-date', params: params(s) };
}

/** A route's `program` back into a Program (quran when missing or unknown). */
export function programOf(v: string | string[] | undefined): Program {
  return PROGRAMS.find((p) => p === v) ?? 'quran';
}
