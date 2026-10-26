import { useHolds } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { PhoneIcon } from '../screen/call-icons';
import { useCalls } from '../state/call-context';

export interface CallButtonProps {
  phone: string;
  /** The name the call screen shows (the chat's title). */
  name: string;
  /** This chat is one the user may write in (not a teacher's own chat with the academy). */
  canSend: boolean;
}

/**
 * The phone icon in the chat header, WhatsApp's (docs/28 §5). Hidden while calls are off, for a role
 * without inbox.send and in a read-only chat; shown but disabled, its reason read out, while the chat
 * line is not on Kapso or a call is already going on.
 */
export function CallButton({ phone, name, canSend }: CallButtonProps) {
  const { color } = useTheme();
  const ui = useCalls();
  const holds = useHolds('inbox.send');
  if (!ui || !holds || !canSend) return null;
  const off = !ui.config.available || ui.busy;
  const label = ui.config.available ? t.calls.call : `${t.calls.call} — ${t.calls.errors.calls_unavailable}`;
  return (
    <IconButton testID="call-button" label={label} disabled={off} onPress={() => ui.call({ phone, name })}>
      <PhoneIcon color={color.lapis} />
    </IconButton>
  );
}
