import { PUBLIC_SETTING_DEFAULTS, type TemplateStatus } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { useState } from 'react';
import type { Mock } from 'vitest';
import { publicConfigQuery } from '@/lib/settings/public-config';
import type { Teacher } from '../api';
import { emptyTeacherForm, type SetField, type TeacherForm } from './teacher-form';
import { TeacherMeetingModeField } from './TeacherMeetingModeField';

/** Test-only: the meeting mode field in a form of its own, its API answered by `apiFetch`. */
function Harness({ start, teacher }: { start: Partial<TeacherForm>; teacher: Teacher | null }) {
  const [form, setForm] = useState<TeacherForm>({ ...emptyTeacherForm(), ...start });
  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  return <TeacherMeetingModeField form={form} set={set} teacher={teacher} />;
}

export interface ShowOptions {
  /** settings.meeting_link_auto; 'pending' = GET /settings/public never answers, 'error' = it fails. */
  auto?: boolean | 'pending' | 'error';
  /** lesson_join_link's row status; null = the list has no such row; 'error' = the list fails. */
  status?: TemplateStatus | null | 'error';
  /** LIVEKIT_* all set; 'error' = GET /settings/integrations fails (403). */
  livekit?: boolean | 'error';
  teacher?: Teacher | null;
}

const fail = () => Promise.reject(new Error('403'));

function answer(path: string, o: Required<ShowOptions>): Promise<unknown> {
  if (path === '/settings/public') return o.auto === 'pending' ? new Promise(() => undefined) : fail();
  if (path === '/messaging/templates') {
    if (o.status === 'error') return fail();
    return Promise.resolve(o.status === null ? [] : [{ key: 'lesson_join_link', status: o.status }]);
  }
  if (path === '/settings/integrations') {
    if (o.livekit === 'error') return fail();
    const keys = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'];
    return Promise.resolve(keys.map((key, i) => ({ key, set: o.livekit || i === 0, source: 'env' })));
  }
  return Promise.resolve([]);
}

export function showMeetingMode(apiFetch: Mock, start: Partial<TeacherForm>, opts: ShowOptions = {}) {
  const o: Required<ShowOptions> = { auto: false, status: 'approved', livekit: true, teacher: null, ...opts };
  apiFetch.mockImplementation((path: string) => answer(path, o));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (typeof o.auto === 'boolean') {
    client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: o.auto });
  }
  render(
    <QueryClientProvider client={client}>
      <Harness start={start} teacher={o.teacher} />
    </QueryClientProvider>,
  );
}

/** Let every pending query settle. */
export const settle = () => new Promise((r) => setTimeout(r, 0));
