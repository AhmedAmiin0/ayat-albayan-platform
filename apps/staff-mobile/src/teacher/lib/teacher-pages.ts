import {
  teacherGateOpen,
  teacherPageOn,
  withPublicDefaults,
  type TeacherGate,
  type TeacherPage,
} from '@ab/settings';
import { useQuery } from '@tanstack/react-query';
import { publicConfigQuery, usePublicConfig } from '@/core/lib/query/public-config';

// Teacher page switches are UI only; the admin, sales and assistant trees never read them.

/** For tabs, rows and buttons: the registry default (off) until GET /settings/public answers. */
export function useTeacherPageOn(): (page: TeacherPage) => boolean {
  const config = usePublicConfig();
  return (page) => teacherPageOn(config, page);
}

/** Meetings opens if either meetings button is on. */
export function useTeacherGateOpen(): (gate: TeacherGate) => boolean {
  const config = usePublicConfig();
  return (gate) => teacherGateOpen(config, gate);
}

export type TeacherGateState = 'loading' | 'error' | 'open' | 'closed';

const UNANSWERED = { pending: 'loading', error: 'error' } as const;

/**
 * For a route guard: 'loading' until the settings answer, so an open page never bounces; 'error'
 * when they cannot be read (offline never sends the teacher away silently). `retry` refetches.
 */
interface GateAnswer { state: TeacherGateState; retry: () => void }

export function useTeacherGateState(gate: TeacherGate): GateAnswer {
  const config = useQuery(publicConfigQuery);
  const retry = () => void config.refetch();
  if (config.status !== 'success') return { state: UNANSWERED[config.status], retry };
  const open = teacherGateOpen(withPublicDefaults(config.data), gate);
  return { state: open ? 'open' : 'closed', retry };
}
