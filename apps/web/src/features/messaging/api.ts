import type { AcademySettings, LineCheckView, SendGateView, SettingsUpdate } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

/** GET /settings (admin): every academy setting with its default filled in. */
export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: () => apiFetch<AcademySettings>('/settings'),
});

/** GET /messages/gate: the effective send gate (env, WhatsApp config, kill switch) and the queue. */
export const sendGateQuery = queryOptions({
  queryKey: ['send-gate'],
  queryFn: () => apiFetch<SendGateView>('/messages/gate'),
});

/** PATCH /settings (audited): only the keys sent change. */
export const updateSettings = (body: SettingsUpdate) => apiSend<AcademySettings>('PATCH', '/settings', body);

/** POST /messaging/lines/check (admin): both WhatsApp lines as Meta reports them now; never prefetched. */
export const checkLines = () => apiSend<LineCheckView[]>('POST', '/messaging/lines/check');
