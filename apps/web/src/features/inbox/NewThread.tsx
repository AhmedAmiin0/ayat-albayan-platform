import { formatPhone, type ThreadLesson } from '@ab/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { noneAllowedText, useNoneAllowed } from './allowed-templates';
import { useInboxMode } from './mode';
import { TemplateComposer } from './TemplateComposer';

/**
 * A number with no message yet: opened from a lead, a booking or «محادثة جديدة» (admin and sales, same
 * path). WhatsApp opens no window without the family's reply, so the first message is an approved
 * template; once it is queued the thread exists and the normal pane takes over. A teacher only reads.
 * Sales with no template allowed reads why she cannot start it (W7), not an empty composer.
 * `lessons`: the family's next lessons (the API finds a booked family by its number), for rule 6.
 */
export function NewThread({ phone, lessons }: { phone: string; lessons: readonly ThreadLesson[] }) {
  const mode = useInboxMode();
  const writes = mode !== 'teacher';
  // No messages.read, or none of the allowed templates (W7, W12).
  const none = useNoneAllowed(false);
  const noneAllowed = mode === 'sales' ? none : null;
  const composes = writes && !noneAllowed;
  return (
    <section aria-label={t.inbox.newChat.title} className="grid content-start gap-4">
      <h2 className="text-lg font-semibold">
        {writes ? <Ltr>{formatPhone(phone)}</Ltr> : t.inbox.newChat.title}
      </h2>
      <EmptyState title={t.inbox.noThread}>{noneAllowed ? noneAllowedText(noneAllowed, t.inbox.newChat.noAllowed) : composes ? t.inbox.newChat.firstTemplate : null}</EmptyState>
      {composes && <TemplateComposer phone={phone} context={{ studentName: null, teacherName: null, lessons }} teacher={false} />}
    </section>
  );
}
