import { teacherPageOn, withPublicDefaults, type TeacherPage } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { publicConfigQuery, usePublicConfig } from './public-config';

// The teacher page switches (owner 2026-11-13, settings «صفحات المعلم»): UI only; admin, sales and
// assistant screens never read them.

/** For links and buttons: the registry default (off) until GET /settings/public answers. */
export function useTeacherPageOn(): (page: TeacherPage) => boolean {
  const config = usePublicConfig();
  return (page) => teacherPageOn(config, page);
}

export type TeacherPageState = 'loading' | 'on' | 'off';

/** For a route guard: 'loading' until the settings answer, so a refresh on an open page never bounces. */
export function useTeacherPageState(page: TeacherPage): TeacherPageState {
  const config = useQuery(publicConfigQuery);
  if (config.isPending) return 'loading';
  return teacherPageOn(withPublicDefaults(config.data), page) ? 'on' : 'off';
}
