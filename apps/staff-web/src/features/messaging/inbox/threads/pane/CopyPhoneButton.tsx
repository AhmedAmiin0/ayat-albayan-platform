import { useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { IconButton } from '@ab/web-kit/components/ui/form/icon-button';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { copyText } from '@/features/messaging/inbox/messages/lib/save-file';

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
