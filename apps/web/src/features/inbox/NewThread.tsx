import { formatPhone } from '@ab/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { useInboxMode } from './mode';
import { TemplateComposer } from './TemplateComposer';

const NO_CONTEXT = { studentName: null, teacherName: null, lessons: [] };

/**
 * A number with no message yet: opened from a lead, a booking or «محادثة جديدة» (admin and sales, same
 * path). WhatsApp opens no window without the family's reply, so the first message is an approved
 * template; once it is queued the thread exists and the normal pane takes over. A teacher only reads.
 */
export function NewThread({ phone }: { phone: string }) {
  const writes = useInboxMode() !== 'teacher';
  return (
    <section aria-label={t.inbox.newChat.title} className="grid content-start gap-4">
      <h2 className="text-lg font-semibold">
        {writes ? <Ltr>{formatPhone(phone)}</Ltr> : t.inbox.newChat.title}
      </h2>
      <EmptyState title={t.inbox.noThread}>{writes ? t.inbox.newChat.firstTemplate : null}</EmptyState>
      {writes && <TemplateComposer phone={phone} context={NO_CONTEXT} teacher={false} />}
    </section>
  );
}
