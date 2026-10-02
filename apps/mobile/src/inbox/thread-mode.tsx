import type { MessageView, ThreadView } from '@ab/shared';
import { createContext, type ReactNode, useContext } from 'react';
import { threadHref } from './thread-cache';

/**
 * Who reads the chats (R-MSG-05, R-TCH-03). The admin sees every thread with its lead tools; a
 * teacher (the teacher tabs) sees only her students' guardians and her own chat with the academy,
 * replies from the academy number, and never gets the admin-only actions. The API enforces the
 * scope; this only decides what the shared thread screens show and where they link.
 */
export type ThreadMode = { kind: 'admin' } | { kind: 'teacher'; teacherId: string };

const ThreadModeContext = createContext<ThreadMode>({ kind: 'admin' });

export function ThreadModeProvider({ value, children }: { value: ThreadMode; children: ReactNode }) {
  return <ThreadModeContext.Provider value={value}>{children}</ThreadModeContext.Provider>;
}

export function useThreadMode(): ThreadMode {
  return useContext(ThreadModeContext);
}

/** Where this mode's chats live: the admin's «المحادثات» tab or the teacher's. */
export function threadBase(mode: ThreadMode): string {
  return mode.kind === 'teacher' ? '/teacher/chats' : '/inbox';
}

/** This mode's route of a thread (the + travels encoded, as in threadHref). */
export function threadLink(phone: string, mode: ThreadMode): string {
  return mode.kind === 'teacher' ? `/teacher/chats/${encodeURIComponent(phone)}` : threadHref(phone);
}

/** The teacher's own chat with the academy: she reads it, the academy answers it (R-MSG-05). */
export function isOwnThread(mode: ThreadMode, thread: ThreadView | null): boolean {
  return mode.kind === 'teacher' && thread?.teacher_id === mode.teacherId;
}

/**
 * The teacher who sent this row from the academy number, so the admin sees «بعتها: أبرار».
 * TODO(merge): `sent_by_teacher_name` joins MessageView in @ab/shared (teacher-mode step 0); until
 * then it is read as an optional extra field. null = the academy or a system job.
 */
export function sentByName(m: MessageView): string | null {
  const name = (m as MessageView & { sent_by_teacher_name?: string | null }).sent_by_teacher_name;
  return typeof name === 'string' && name ? name : null;
}
