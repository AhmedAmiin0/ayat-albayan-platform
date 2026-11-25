import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  BookingLeaveGuard,
  BookingPage,
  parseBookSearch,
  searchForStudent,
} from '@/features/teaching/booking';

/** /admin/book?studentId= (+ ?kind=makeup&missedLessonId=) | ?leadId=&phone=&name= (+ ?teacherId&startsAt from a free gap) — the booking wizard (R-SCH-06, R-LEAD-06, R-SCH-10). */
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
      <BookingLeaveGuard unfinished={unfinished} />
    </>
  );
}
