import type { LessonView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { CopyLinkButton } from './CopyLinkButton';
import { StaffJoinButton } from './StaffJoinButton';
import { SendLinkButton } from './SendLinkButton';

/**
 * The online-classroom block, under its own heading near the top of the admin drawer: go in,
 * copy the student's link, or send it by WhatsApp (needs the approved template).
 */
export function ClassroomActions({ lesson }: { lesson: LessonView }) {
  return (
    <section aria-label={t.classroom.sectionTitle} className="grid gap-3 rounded-lg border border-rule bg-sunk p-3">
      <div>
        <h3 className="font-display text-h4 font-bold">{t.classroom.sectionTitle}</h3>
        <p className="text-xs text-ink-3">{t.classroom.sectionHint}</p>
      </div>
      <StaffJoinButton lesson={lesson} />
      <CopyLinkButton lesson={lesson} />
      <SendLinkButton lesson={lesson} />
    </section>
  );
}
