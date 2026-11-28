import { type AcademySettings, GATE_CONFIRM_TEXT, type GateSwitch } from '@ab/settings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@ab/web-kit';
import { CONFIG_QUERY_KEYS } from '@/lib/settings/query-keys';
import type { SettingSwitchOptions } from '@/lib/settings/use-setting-switch';

/** One change to the messaging gate: the send switch, auto messages, or the CRM cut-over tick. */
export type GateChange = { sending: boolean } | { auto: boolean } | { cutover: boolean };

/** PUT /messages/gate/{sending|auto}: ON carries the confirm text the server checks; OFF never. */
function putSwitch(sw: GateSwitch, on: boolean): Promise<AcademySettings> {
  const body = on ? { on, confirmText: GATE_CONFIRM_TEXT[sw] } : { on };
  return apiSend<AcademySettings>('PUT', `/messages/gate/${sw}`, body);
}

/**
 * The only writers of messaging_enabled, auto_messages_enabled and crm_cutover_done (docs/26 §2f,
 * 26-P0; PATCH /settings does not write them). Each answers the full AcademySettings.
 */
export function sendGateChange(change: GateChange): Promise<AcademySettings> {
  if ('sending' in change) return putSwitch('sending', change.sending);
  if ('auto' in change) return putSwitch('auto', change.auto);
  return apiSend<AcademySettings>('PUT', '/messages/gate/cutover', { done: change.cutover });
}

/** useSettingSwitch for the gate routes: the answer replaces ['settings'], then onSaved. */
export function useGateSwitch(opts: SettingSwitchOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendGateChange,
    onSuccess: async (next) => {
      queryClient.setQueryData(CONFIG_QUERY_KEYS.settings, next);
      await opts.onSaved?.(next);
    },
  });
}
