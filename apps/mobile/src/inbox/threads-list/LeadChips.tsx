import { LEAD_STATUSES, type LeadStatus } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { ChatChoice } from '@/inbox/lists/components/ChatListChips';
import { ListChip } from '@/inbox/lists/components/ListChip';

/** The stages she works (review 2026-10-29 #2); «مشترك» is a family by then, «مفقود» is not chased here. */
const WORKED_STAGES: readonly LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'converted' && s !== 'lost');

const stageOf = (choice: ChatChoice): LeadStatus | null =>
  typeof choice === 'object' && 'stage' in choice ? choice.stage : null;

interface LeadChipsProps {
  value: ChatChoice;
  onChange: (choice: ChatChoice) => void;
}

/**
 * Staff choices after «غير مقروءة» (admin and sales trees; a teacher sees no lead): «بانتظار ردّك»
 * (the family wrote last) and one chip per lead stage, served by GET /threads?status= (the sales
 * scope already reads every chat with its lead, docs/16). One choice at a time, as the rest of the row.
 */
export function LeadChips({ value, onChange }: LeadChipsProps) {
  const stage = stageOf(value);
  return (
    <>
      <ListChip label={t.inbox.filterWaiting} selected={value === 'waiting'} onPress={() => onChange('waiting')} />
      {WORKED_STAGES.map((s) => (
        <ListChip
          key={s}
          label={t.enums.leadStatus[s]}
          selected={stage === s}
          onPress={() => onChange({ stage: s })}
        />
      ))}
    </>
  );
}
