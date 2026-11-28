import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { RouteLeaveGuard, t } from '@ab/web-kit';
import { BookingPage, parseBookSearch, searchForStudent } from '@/features/teaching/booking';

/**
 * /admin/book: the booking wizard (R-SCH-06, R-LEAD-06, R-SCH-10). Search: ?studentId=
 * (with ?kind=makeup&missedLessonId=), or ?leadId=&phone=&name=, plus ?teacherId&startsAt
 * from a free gap.
 */
export const Route = createFileRoute('/admin/(ops)/book')({
  validateSearch: parseBookSearch,
  component: BookRoute,
});

function BookRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [unfinished, setUnfinished] = useState(false);
  return (
    <>
      <BookingPage
        search={search}
        onOpenStudent={(studentId, kind) =>
          void navigate({ search: (prev) => searchForStudent(prev, studentId, kind) })
        }
        onUnfinished={setUnfinished}
      />
      <RouteLeaveGuard when={unfinished} words={t.booking.leave} />
    </>
  );
}
