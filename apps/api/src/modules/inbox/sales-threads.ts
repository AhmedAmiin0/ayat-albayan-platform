import type { MessageView, ThreadLesson, ThreadPeople, ThreadView } from '@ab/shared';
import type { ThreadMessageRow } from '../whatsapp/message.mapper';
import type { SalesScope } from '../sales/sales-scope';

/** Templates whose template_params.button is a signed link (a feedback answer, a classroom entry): never shown to sales (migration 187). */
const LINK_TEMPLATES: ReadonlySet<string> = new Set(['lesson_feedback_request', 'lesson_join_link']);

/** Rows a salesperson may see: every message of their chats except those two templates (plain text has no key). */
export const visibleToSales = (row: Pick<ThreadMessageRow, 'template_key'>): boolean =>
  !row.template_key || !LINK_TEMPLATES.has(row.template_key);

/** A thread as sales sees it: the lead and the family tag stay, the money flag («مش مدفوع») does not. */
export const forSales = (view: ThreadView): ThreadView => ({ ...view, unpaid: false });

/** Defence in depth next to visibleToSales: no link of a classroom or feedback template in any payload. */
export const withoutLinks = (view: MessageView): MessageView =>
  view.template_key && LINK_TEMPLATES.has(view.template_key) ? { ...view, template_params: null, click_to_chat: null } : view;

/** The next lessons without their meeting link: the room is entered through the API (POST /lessons/:id/room/join). */
export const salesLessons = (lessons: readonly ThreadLesson[]): ThreadLesson[] => lessons.map((l) => ({ ...l, meeting_link: null }));

/** The guardian, the lead and the family's children without packages or money. */
export function salesPeople(people: ThreadPeople, scope: SalesScope): ThreadPeople {
  return {
    ...people,
    students: people.students.filter((s) => scope.studentIds.has(s.id)).map((s) => ({ ...s, subscription: null })),
  };
}
