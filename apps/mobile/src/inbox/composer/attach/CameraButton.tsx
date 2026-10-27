import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { CameraIcon } from '../../shared/composer-icons';
import { usePickSend } from './use-pick-send';

/**
 * The pill's camera (owner 2026-10-27, as WhatsApp): a photo taken now goes to the family at once
 * (a compressed JPEG with no location, as a receipt). Staff only; the pill hides it while typing.
 */
export function CameraButton({ phone, onError }: { phone: string; onError: (message: string | null) => void }) {
  const { color } = useTheme();
  const { pick, pending } = usePickSend(phone, onError);
  return (
    <IconButton label={t.inbox.composer.camera} disabled={pending} onPress={() => void pick('camera')}>
      <CameraIcon color={color.lapis} />
    </IconButton>
  );
}
