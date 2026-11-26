import { type MessageView, senderLine, type ThreadView } from '@ab/shared';
import { createContext, type ReactNode, useContext } from 'react';
import { t } from '@ab/mobile-kit';
import { threadHref } from './thread-cache';

/**
 * Who reads the chats (R-MSG-05, R-TCH-03). The admin sees every thread with its lead tools; a
 * teacher (the teacher tabs) sees only her students' guardians and her own chat with the academy,
 * replies from the academy number, and never gets the admin-only actions. The API enforces the
 * scope; this only decides what the shared thread screens show and where they link.
 */
export type ThreadMode = { kind: 'admin' } | { kind: 'teacher'; teacherId: string };

const ThreadModeContext = createContext<ThreadMode>({ kind: 'admin' });

export function ThreadModeProvider({
  value,
  children,
}: {
  value: ThreadMode;
  children: ReactNode;
}) {
  return <ThreadModeContext.Provider value={value}>{children}</ThreadModeContext.Provider>;
}

export function useThreadMode(): ThreadMode {
  return useContext(ThreadModeContext);
}

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

/** Null for inbound rows, imported history and the optimistic row until the API row arrives. */
export function senderText(m: MessageView): string | null {
  const line = senderLine(m);
  if (!line) return null;
  return line.kind === 'name' ? t.inbox.sentBy.replace('{name}', line.name) : t.inbox.automaticMessage;
}
