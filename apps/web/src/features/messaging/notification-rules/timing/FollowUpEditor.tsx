import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { fillText } from '@/features/messaging/notification-rules/rule-text';
import { MAX_FOLLOW_UPS, type TimingDraft } from '@/features/messaging/notification-rules/rule-timing';
import { CountInput } from './CountInput';

type FollowUp = Extract<TimingDraft, { kind: 'follow_up_slots' }>;

export interface FollowUpEditorProps {
  draft: FollowUp;
  onChange: (draft: FollowUp) => void;
  disabled: boolean;
  describedBy: string | undefined;
  invalid: boolean;
}

const tm = t.notificationRules.timing;

/**
 * «متابعة العميل بموعدين مقترحين» (docs/26b §6a 1.15, 1.17–1.18): up to five follow-ups in hours,
 * ascending, then the window of the suggested times (hours from now, days ahead).
 */
export function FollowUpEditor({ draft, onChange, disabled, describedBy, invalid }: FollowUpEditorProps) {
  const setHour = (i: number, value: string) => onChange({ ...draft, hours: draft.hours.map((h, j) => (j === i ? value : h)) });
  const remove = (i: number) => onChange({ ...draft, hours: draft.hours.filter((_, j) => j !== i) });
  const last = Number(draft.hours.at(-1) ?? 0);
  return (
    <span className="grid gap-1.5">
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {draft.hours.map((h, i) => (
          // The list only grows or shrinks at its end, so the index is a stable key.
          <span key={i} className="inline-flex items-center gap-1">
            <CountInput
              label={fillText(tm.followUpLabel, { n: i + 1 })}
              unit={tm.followUpUnit}
              value={h}
              onChange={(value) => setHour(i, value)}
              bounds={{ min: 1, max: 720 }}
              disabled={disabled}
              describedBy={describedBy}
              invalid={invalid}
            />
            {draft.hours.length > 1 && i === draft.hours.length - 1 && (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => remove(i)}>
                {fillText(tm.followUpRemove, { n: i + 1 })}
              </Button>
            )}
          </span>
        ))}
        {draft.hours.length < MAX_FOLLOW_UPS && (
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange({ ...draft, hours: [...draft.hours, String(Math.min(720, (Number.isFinite(last) ? last : 0) + 24))] })}
          >
            {tm.followUpAdd}
          </Button>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <CountInput
          label={tm.slotsFromLabel}
          unit={tm.slotsFromUnit}
          value={draft.from}
          onChange={(from) => onChange({ ...draft, from })}
          bounds={{ min: 1, max: 168 }}
          disabled={disabled}
          describedBy={describedBy}
          invalid={invalid}
        />
        <CountInput
          label={tm.slotsToLabel}
          unit={tm.slotsToUnit}
          value={draft.to}
          onChange={(to) => onChange({ ...draft, to })}
          bounds={{ min: 1, max: 30 }}
          disabled={disabled}
          describedBy={describedBy}
          invalid={invalid}
        />
      </span>
    </span>
  );
}
