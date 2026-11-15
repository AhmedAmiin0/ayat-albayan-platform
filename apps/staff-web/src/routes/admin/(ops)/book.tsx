import { createFileRoute } from '@tanstack/react-router';
import { parseBookSearch } from '@/features/teaching/booking/api';
import { BookingPage } from '@/features/teaching/booking/BookingPage';
import { searchForStudent } from '@/features/teaching/booking/hint';

/** /admin/book?studentId= (+ ?kind=makeup&missedLessonId=) | ?leadId=&phone=&name= (+ ?teacherId&startsAt from a free gap) — the booking wizard (R-SCH-06, R-LEAD-06, R-SCH-10). */
export const Route = createFileRoute('/admin/(ops)/book')({
  validateSearch: parseBookSearch,
  component: BookRoute,
});

function BookRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <BookingPage
      search={search}
      onOpenStudent={(studentId, kind) => void navigate({ search: (prev) => searchForStudent(prev, studentId, kind) })}
    />
  );
}
