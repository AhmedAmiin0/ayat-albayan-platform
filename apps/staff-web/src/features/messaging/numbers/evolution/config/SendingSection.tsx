import { CheckField } from '@/components/settings/fields/CheckField';
import { t } from '@/lib/i18n/i18n';
import { ConfigFieldset } from './ConfigFieldset';
import { ConfigTextField } from './ConfigTextField';
import type { SectionProps } from './config-draft';

const c = t.numbers.evolution.config;

/**
 * «الإرسال»: the link preview. No typing delay (owner 2026-11-06: families never see «يكتب…»).
 */
export function SendingSection({ value, onChange }: SectionProps<'sending'>) {
  return (
    <ConfigFieldset legend={c.sections.sending}>
      <CheckField
        label={c.sending.link_preview}
        checked={value.link_preview}
        onChange={(link_preview) => onChange({ link_preview })}
      />
    </ConfigFieldset>
  );
}

/** «حدود الإرسال» (the platform's own pacing): the gap between two sends and the daily cap. */
export function LimitsSection({ value, errors, onChange }: SectionProps<'limits'>) {
  return (
    <ConfigFieldset legend={c.sections.limits}>
      <ConfigTextField
        numeric
        label={c.limits.gap_ms}
        hint={c.limits.gapHint}
        error={errors['limits.gap_ms']}
        value={value.gap_ms}
        onChange={(gap_ms) => onChange({ gap_ms })}
      />
      <ConfigTextField
        numeric
        label={c.limits.daily_cap}
        hint={c.limits.daily_capHint}
        error={errors['limits.daily_cap']}
        value={value.daily_cap}
        onChange={(daily_cap) => onChange({ daily_cap })}
      />
      <ConfigTextField
        numeric
        label={c.limits.error_trip}
        hint={c.limits.error_tripHint}
        error={errors['limits.error_trip']}
        value={value.error_trip}
        onChange={(error_trip) => onChange({ error_trip })}
      />
    </ConfigFieldset>
  );
}
