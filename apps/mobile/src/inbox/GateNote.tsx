import type { SendGateView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

const PATH = '/messages/gate';

/**
 * While a send gate is closed, messages wait in the queue (docs/12 §3.1): the admin's switch
 * («الإرسال متوقف») or the server — env off / WhatsApp not configured — which the switch alone
 * can't open. Nothing when sending is on.
 */
export function GateNote() {
  const { color } = useTheme();
  const gate = useQuery({ queryKey: pathKey(PATH), queryFn: () => apiFetch<SendGateView>(PATH) });
  if (gate.data?.open !== false) return null;
  return (
    <AppText
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink2,
      }}
    >
      {gate.data.reason === 'switch_off' ? t.inbox.messagingOff : t.inbox.messagingOffServer}
    </AppText>
  );
}
