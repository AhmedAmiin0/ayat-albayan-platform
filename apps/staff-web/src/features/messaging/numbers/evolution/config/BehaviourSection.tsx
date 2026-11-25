import { CheckField } from '@/components/settings/fields/CheckField';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ConfigFieldset } from './ConfigFieldset';
import { ConfigTextField } from './ConfigTextField';
import type { SectionProps } from './config-draft';

const c = t.numbers.evolution.config;
/** No «always online» (families never see us «online»; the push pins it off). */
const SWITCHES = [
  'reject_call', 'groups_ignore', 'read_messages', 'read_status', 'sync_full_history',
] as const;
type Switch = (typeof SWITCHES)[number];

const switchPatch = (key: Switch, on: boolean) => ({ [key]: on });

export function BehaviourSection({ value, errors, onChange }: SectionProps<'behaviour'>) {
  return (
    <ConfigFieldset legend={c.sections.behaviour}>
      <div className="grid">
        {SWITCHES.map((key) => (
          <CheckField
            key={key}
            label={c.behaviour[key]}
            checked={value[key]}
            onChange={(on) => onChange(switchPatch(key, on))}
          />
        ))}
      </div>
      {value.reject_call && (
        <ConfigTextField
          label={c.behaviour.msg_call}
          hint={c.behaviour.msg_callHint}
          error={errors['behaviour.msg_call']}
          value={value.msg_call}
          onChange={(msg_call) => onChange({ msg_call })}
        />
      )}
    </ConfigFieldset>
  );
}
