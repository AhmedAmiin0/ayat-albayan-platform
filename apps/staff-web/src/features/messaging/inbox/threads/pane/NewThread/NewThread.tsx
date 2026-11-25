import type { ThreadLesson } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { EmptyState, Ltr, t } from '@ab/web-kit';
import {
  noneAllowedText,
  useNoneAllowed,
} from '@/features/messaging/inbox/composer/lib/allowed-templates';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { TemplateComposer } from '@/features/messaging/inbox/composer/components/TemplateComposer';
import { LinkedCourseDialog } from '@/features/sales/sales-money';

/** WhatsApp opens no window without the family's reply, so the first message is a template. */
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
      <EmptyState title={t.inbox.noThread}>
        {noneAllowed
          ? noneAllowedText(noneAllowed, t.inbox.newChat.noAllowed)
          : composes
            ? t.inbox.newChat.firstTemplate
            : null}
      </EmptyState>
      {composes && (
        <TemplateComposer
          phone={phone}
          context={{ studentName: null, teacherName: null, lessons }}
          teacher={false}
        />
      )}
      {mode === 'sales' && <LinkedCourseDialog />}
    </section>
  );
}
