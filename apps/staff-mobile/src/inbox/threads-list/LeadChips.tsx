import { LEAD_STATUSES, type LeadStatus } from '@ab/catalog';
import { t } from '@ab/mobile-kit';
import type { ChatChoice } from '@/inbox/lists/components/ChatListChips';
import { ListChip } from '@/inbox/lists/components/ListChip';

/** Converted leads are families by then and lost leads are not chased here. */
const WORKED_STAGES: readonly LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'converted' && s !== 'lost');

const stageOf = (choice: ChatChoice): LeadStatus | null =>
  typeof choice === 'object' && 'stage' in choice ? choice.stage : null;

interface LeadChipsProps {
  value: ChatChoice;
  onChange: (choice: ChatChoice) => void;
}

/** Staff only; the sales scope already reads every chat with its lead (docs/16). */
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
