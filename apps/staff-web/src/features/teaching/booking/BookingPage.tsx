import { useState } from 'react';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { BookSearch } from './api';
import { LeadBooking, StudentBooking } from './booking-entries';
import { emptyDraft, type BookingDraft } from './draft/draft';
import { bookHint } from './hint';
import { KeptBookingWizard, keptKey } from './kept';

export { draftFromLead, draftFromStudent } from './booking-entries';

export interface BookingPageProps {
  search: BookSearch;
  /** Reopens /admin/book for another student (with the booking type picked so far). */
  onOpenStudent: (id: string, kind?: BookingDraft['kind']) => void;
  /** Started and not booked yet (the route's leave guard). */
  onUnfinished?: ((unfinished: boolean) => void) | undefined;
}

type Choice = Pick<BookingDraft, 'kind' | 'pkg'>;

/** Entry points per R-SCH-06, R-LEAD-06 and R-SCH-10, or bare (search a student first). */
export function BookingPage({ search, onOpenStudent, onUnfinished }: BookingPageProps) {
  // The title follows the admin's pick; a new URL (another lead or package) forgets the pick.
  const [picked, setPicked] = useState<{ from: BookSearch['pkg']; choice: Choice } | null>(null);
  const choice = picked && picked.from === search.pkg ? picked.choice : null;
  const pkg = choice?.pkg ?? search.pkg ?? 'trial';
  const kind = choice?.kind ?? search.kind;
  const onChoice = (next: Choice) => setPicked({ from: search.pkg, choice: next });
  const trial = !!search.leadId && pkg === 'trial';
  const hint = bookHint(search);
  const hintKey = [hint?.teacherId, hint?.startsAt].join('-');
  const entry = { onOpenStudent, hint, onChoice, onUnfinished };
  return (
    <>
      <PageHead>
        <Cartouche>
          {kind === 'makeup'
            ? t.booking.makeup.title
            : trial
              ? t.booking.trialTitle
              : t.booking.title}
        </Cartouche>
      </PageHead>
      {search.studentId ? (
        <StudentBooking search={search} studentId={search.studentId} {...entry} />
      ) : search.leadId ? (
        <LeadBooking
          key={`${search.leadId}-${search.pkg ?? 'trial'}-${hintKey}`}
          search={search}
          {...entry}
        />
      ) : (
        <KeptBookingWizard
          key={`bare-${hintKey}`}
          keepKey={keptKey(search)}
          initial={emptyDraft()}
          primary={null}
          siblings={[]}
          {...entry}
        />
      )}
    </>
  );
}
