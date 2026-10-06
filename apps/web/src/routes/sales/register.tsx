import { createFileRoute } from '@tanstack/react-router';
import { parseBookSearch, type BookSearch } from '@/features/booking/api';
import { SalesRegister } from '@/features/sales/SalesRegister';

/** The assistant registers a trial for a new student: only the chat (lead, phone, name) is kept, never a package or a student. */
const parseRegisterSearch = (s: Record<string, unknown>): BookSearch => {
  const { leadId, phone, name } = parseBookSearch(s);
  if (!leadId) return {};
  return { leadId, ...(phone ? { phone } : {}), ...(name ? { name } : {}) };
};

/** /sales/register?leadId&phone&name «تسجيل طالب» — a guardian + student + trial, from a chat of mine or typed. */
export const Route = createFileRoute('/sales/register')({
  validateSearch: parseRegisterSearch,
  component: RegisterRoute,
});

function RegisterRoute() {
  return <SalesRegister search={Route.useSearch()} />;
}
