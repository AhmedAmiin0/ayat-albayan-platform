import { useState } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';
import type { BookSearch } from './api';
import { LeadBooking, StudentBooking } from './booking-entries';
import { BookingWizard } from './BookingWizard';
import { emptyDraft, type BookingDraft } from './draft';
import { bookHint } from './hint';

export { draftFromLead, draftFromStudent } from './booking-entries';

export interface BookingPageProps {
  search: BookSearch;
  /** Reopens /admin/book for another student (with the booking type picked so far). */
  onOpenStudent: (id: string, kind?: BookingDraft['kind']) => void;
}

type Choice = Pick<BookingDraft, 'kind' | 'pkg'>;

/**
 * /admin/book (R-SCH-06): from a student profile «احجز حلقات» (student + siblings), from a lead
 * row «حجز حلقة تجريبية» or the chat's «اشترك» (new student + guardian, R-LEAD-06), from a missed
 * lesson «حجز تعويضي» (R-SCH-10), or bare (search a student first).
 */
export function BookingPage({ search, onOpenStudent }: BookingPageProps) {
  // The title follows what the admin has picked: «تجريبية» only while it is the free trial, the
  // makeup's own while it is a makeup. A new URL (another lead or package) forgets the pick.
  const [picked, setPicked] = useState<{ from: BookSearch['pkg']; choice: Choice } | null>(null);
  const choice = picked && picked.from === search.pkg ? picked.choice : null;
  const pkg = choice?.pkg ?? search.pkg ?? 'trial';
  const kind = choice?.kind ?? search.kind;
  const onChoice = (next: Choice) => setPicked({ from: search.pkg, choice: next });
  const trial = !!search.leadId && pkg === 'trial';
  const hint = bookHint(search);
  const hintKey = [hint?.teacherId, hint?.startsAt].join('-');
  const entry = { onOpenStudent, hint, onChoice };
  return (
    <>
      <PageHead>
        <Cartouche>{kind === 'makeup' ? t.booking.makeup.title : trial ? t.booking.trialTitle : t.booking.title}</Cartouche>
      </PageHead>
      {search.studentId ? (
        <StudentBooking search={search} studentId={search.studentId} {...entry} />
      ) : search.leadId ? (
        <LeadBooking key={`${search.leadId}-${search.pkg ?? 'trial'}-${hintKey}`} search={search} {...entry} />
      ) : (
        <BookingWizard key={`bare-${hintKey}`} initial={emptyDraft()} primary={null} siblings={[]} {...entry} />
      )}
    </>
  );
}
