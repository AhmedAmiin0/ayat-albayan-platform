import type { SavedReplyValues, ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { profileQuery } from '@/features/account/api';
import type { PrefillContext } from '../template-params';

/**
 * What a saved reply's placeholders become in this chat: {name} the name the header shows (guardian
 * ?? lead ?? WhatsApp name), {student} the family's first student else the lead's student, {assistant}
 * the signed-in user's own name («حسابي»). A missing one is removed by resolveSavedReply.
 */
export function useReplyValues(thread: ThreadView, context: PrefillContext): SavedReplyValues {
  const me = useQuery(profileQuery).data;
  return {
    name: context.contactName ?? thread.display_name ?? thread.guardian_name ?? thread.lead_name,
    student: context.firstStudentName ?? context.studentName ?? null,
    assistant: me?.full_name ?? null,
  };
}
