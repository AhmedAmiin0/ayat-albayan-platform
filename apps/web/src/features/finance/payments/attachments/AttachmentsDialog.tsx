import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { attachmentsQuery } from '../api';
import { attachmentLabels } from './attachments';

type Props = {
  /** GET …/attachments: /payments/:id/attachments (admin) or /sales/me/payments/:id/attachments (her own). */
  path: string;
  /** Whose payment (the student). */
  description: string;
  onClose: () => void;
};

/** «عرض المرفقات»: the payment's files through 1-hour signed links (the legacy receipt first), each opened in a new tab. */
export function AttachmentsDialog({ path, description, onClose }: Props) {
  const list = useQuery(attachmentsQuery(path));
  const labels = attachmentLabels(list.data ?? []);

  return (
    <Dialog title={t.payments.attachments} description={description} onClose={onClose} layout="center">
      {list.isPending && <p className="text-ink-3">{t.common.loading}</p>}
      {list.isError && <FormAlert>{apiErrorText(list.error, t.payments.error)}</FormAlert>}
      {list.data?.length === 0 && <p className="text-sm text-ink-2">{t.payments.noAttachments}</p>}
      {list.data && list.data.length > 0 && (
        <ul className="grid gap-2">
          {list.data.map((a, i) => (
            <li key={a.id}>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-lapis underline underline-offset-4">
                {labels[i]}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
