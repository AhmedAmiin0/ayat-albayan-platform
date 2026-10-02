import { createFileRoute } from '@tanstack/react-router';
import { parseBookSearch } from '@/features/booking/api';
import { BookingPage } from '@/features/booking/BookingPage';

/** /admin/book?studentId= | ?leadId=&phone=&name= — the booking wizard (R-SCH-06, R-LEAD-06). */
export const Route = createFileRoute('/admin/book')({
  validateSearch: parseBookSearch,
  component: BookRoute,
});

function BookRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <BookingPage search={search} onOpenStudent={(studentId) => void navigate({ search: { studentId } })} />;
}
