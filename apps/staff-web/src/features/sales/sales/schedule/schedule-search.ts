// /sales/schedule URL state: the Riyadh day (`date`, today when absent) and one teacher (`teacherId`).

export interface SalesScheduleSearch {
  date?: string;
  teacherId?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Route `validateSearch`: a malformed date or teacher id is dropped (today, every teacher). */
export function parseSalesScheduleSearch(s: Record<string, unknown>): SalesScheduleSearch {
  const out: SalesScheduleSearch = {};
  const date = s['date'];
  const teacherId = s['teacherId'];
  if (typeof date === 'string' && DATE.test(date) && !Number.isNaN(Date.parse(date))) out.date = date;
  if (typeof teacherId === 'string' && UUID.test(teacherId)) out.teacherId = teacherId;
  return out;
}
