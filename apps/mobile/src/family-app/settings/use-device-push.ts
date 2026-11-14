import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushOptedOut, setPushOptOut } from '@/core/push/device-key';
import { registerPush, unregisterPush } from '@/core/push/registerPush';

/** The device's own switch, never persisted with the cache (it lives in AsyncStorage). */
const OPT_OUT_KEY = ['push', 'device-opt-out'] as const;

const APPLY: Record<'on' | 'off', () => Promise<void>> = {
  on: registerPush,
  off: unregisterPush,
};

/** Remember the choice, then register this device again or take its token off the profile. */
async function switchDevicePush(on: boolean): Promise<void> {
  await setPushOptOut(!on);
  await APPLY[on ? 'on' : 'off']();
}

/**
 * «الإشعارات على هذا الجهاز» (docs/50 §6): `on` is undefined until the saved choice is read. Off
 * unregisters the token (DELETE /me/push-tokens/:token) and keeps registerPush away; on registers.
 */
export function useDevicePush() {
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: OPT_OUT_KEY,
    queryFn: pushOptedOut,
    meta: { noPersist: true },
  });
  const change = useMutation({
    mutationFn: switchDevicePush,
    onSuccess: (_done, on) => client.setQueryData(OPT_OUT_KEY, !on),
  });
  const on = saved.data === undefined ? undefined : !saved.data;
  return { on, busy: change.isPending, set: (next: boolean) => change.mutate(next) };
}
