import { formatPhone, type ThreadLesson } from '@ab/shared';
import { EmptyState } from '@/components/ui/empty-state';
import { Ltr } from '@/components/ui/ltr';
import { t } from '@/lib/i18n';
import { useInboxMode } from './mode';
import { TemplateComposer } from './TemplateComposer';

/**
 * A number with no message yet: opened from a lead, a booking or «محادثة جديدة» (admin and sales, same
 * path). WhatsApp opens no window without the family's reply, so the first message is an approved
 * template; once it is queued the thread exists and the normal pane takes over. A teacher only reads.
 * `lessons`: the family's next lessons (the API finds a booked family by its number), for rule 6.
 */
export function NewThread({ phone, lessons }: { phone: string; lessons: readonly ThreadLesson[] }) {
  const writes = useInboxMode() !== 'teacher';
  return (
    <section aria-label={t.inbox.newChat.title} className="grid content-start gap-4">
      <h2 className="text-lg font-semibold">
        {writes ? <Ltr>{formatPhone(phone)}</Ltr> : t.inbox.newChat.title}
      </h2>
      <EmptyState title={t.inbox.noThread}>{writes ? t.inbox.newChat.firstTemplate : null}</EmptyState>
      {writes && <TemplateComposer phone={phone} context={{ studentName: null, teacherName: null, lessons }} teacher={false} />}
    </section>
  );
}
