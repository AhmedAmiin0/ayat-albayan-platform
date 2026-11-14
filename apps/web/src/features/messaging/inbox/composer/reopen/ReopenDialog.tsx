import { messageTemplate, reopenChoices } from '@ab/client-core';
import { freeTextSlot, MESSAGE_TEMPLATE, type ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { templatesQuery } from '@/features/messaging/templates';
import { t } from '@/lib/i18n/i18n';
import {
  allowedTemplates,
  useReadsMessaging,
} from '@/features/messaging/inbox/composer/lib/allowed-templates';
import type { PrefillContext } from '@/features/messaging/inbox/composer/lib/template-params';
import { TemplateComposer } from '@/features/messaging/inbox/composer/components/TemplateComposer';

const bar = t.inbox.reopenBar;

export interface ReopenDialogProps {
  thread: Pick<ThreadView, 'phone_e164' | 'reopen_template'>;
  context: PrefillContext;
  /** A teacher's own chat number: the teacher's templates. */
  teacher: boolean;
  onClose: () => void;
  /** «أرسِل الآن داخل قالب» (owner 2026-11-14): academy_message picked, {{1}} = this draft. */
  carry?: { text: string; onSent: () => void } | undefined;
}

/**
 * «إعادة فتح المحادثة» (owner 2026-11-14, like Kapso): the templates this user may send from the
 * chat line, the academy's `chat_reopen_template` picked and its variables filled from the chat
 * (still editable), the WhatsApp preview, then send. The API keeps it as this window's reopen.
 */
export function ReopenDialog({ thread, context, teacher, onClose, carry }: ReopenDialogProps) {
  const templates = useQuery({ ...templatesQuery, enabled: useReadsMessaging() });
  const allowed = allowedTemplates(templates.data, teacher);
  const preferred = carry ? MESSAGE_TEMPLATE : thread.reopen_template;
  const choices = reopenChoices(allowed, preferred);
  const slot = freeTextSlot(MESSAGE_TEMPLATE);
  const values = carry && slot && messageTemplate(allowed) ? { [slot]: carry.text } : {};
  const onSent = () => {
    carry?.onSent();
    onClose();
  };
  const reopen = { ...choices, values, onSent };
  return (
    <Dialog title={t.inbox.reopenBar.action} description={bar.closed} onClose={onClose}>
      {templates.isError && <FormAlert>{t.common.error}</FormAlert>}
      {templates.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {templates.isSuccess && (
        <TemplateComposer {...{ context, teacher, reopen }} phone={thread.phone_e164} />
      )}
    </Dialog>
  );
}
