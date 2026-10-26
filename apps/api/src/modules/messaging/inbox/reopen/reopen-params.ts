import { BODY_SLOTS, type TemplateParamsInput, type TemplateView } from '@ab/shared';
import type { ThreadRow } from '../threads/threads.mapper';

/**
 * The reopen template's variables from what the thread knows, as the composer prefills them
 * (prefillParams: contact_name = the name the header shows, teacher_name). A name it cannot fill
 * stays empty: ThreadSendService then refuses the send (missing_params), nothing half-filled goes out.
 */
export function reopenParams(tpl: Pick<TemplateView, 'params'>, thread: ThreadRow | null): TemplateParamsInput {
  const known: Record<string, string | null | undefined> = {
    contact_name: thread?.display_name,
    guardian_name: thread?.guardian_name ?? thread?.display_name,
    teacher_name: thread?.teacher_name,
  };
  const out: TemplateParamsInput = {};
  tpl.params.slice(0, BODY_SLOTS.length).forEach((name, i) => {
    const value = known[name]?.trim();
    const slot = BODY_SLOTS[i];
    if (value && slot) out[slot] = value;
  });
  return out;
}
