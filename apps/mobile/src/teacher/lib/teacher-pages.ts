import { teacherGateOpen, teacherPageOn, withPublicDefaults, type TeacherGate, type TeacherPage } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { publicConfigQuery, usePublicConfig } from '@/core/lib/query/public-config';

// The teacher page switches (owner 2026-11-13, settings «صفحات المعلم»): UI only; the admin,
// sales and assistant trees never read them.

/** For tabs, rows and buttons: the registry default (off) until GET /settings/public answers. */
export function useTeacherPageOn(): (page: TeacherPage) => boolean {
  const config = usePublicConfig();
  return (page) => teacherPageOn(config, page);
}

/** For «المزيد»: does this gated row open (meetings: either meetings button)? */
export function useTeacherGateOpen(): (gate: TeacherGate) => boolean {
  const config = usePublicConfig();
  return (gate) => teacherGateOpen(config, gate);
}

export type TeacherGateState = 'loading' | 'open' | 'closed';

/** For a route guard: 'loading' until the settings answer, so an open page never bounces. */
export function useTeacherGateState(gate: TeacherGate): TeacherGateState {
  const config = useQuery(publicConfigQuery);
  if (config.isPending) return 'loading';
  return teacherGateOpen(withPublicDefaults(config.data), gate) ? 'open' : 'closed';
}
