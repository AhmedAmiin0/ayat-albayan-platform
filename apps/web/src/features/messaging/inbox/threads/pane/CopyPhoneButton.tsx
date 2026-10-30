import { useState } from 'react';
import { Icon } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { copyText } from '../../messages/lib/save-file';

/** «نسخ الرقم» beside the chat's name (owner 2026-10-26): the number in E.164, then «نُسِخ». */
export function CopyPhoneButton({ phone }: { phone: string }) {
  const [said, say] = useState<boolean | null>(null);
  const done = () => say(null);
  return (
    <>
      <IconButton label={t.inbox.copy.phone} title={t.inbox.copy.phone} onClick={() => void copyText(phone).then(say)}>
        <Icon name="copy" />
      </IconButton>
      {said !== null && (
        <Toast
          message={said ? t.inbox.copy.done : t.inbox.copy.failed}
          tone={said ? 'info' : 'error'}
          duration={said ? 2000 : 5000}
          onDismiss={done}
        />
      )}
    </>
  );
}
