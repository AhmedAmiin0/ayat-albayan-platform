import { t } from '@/lib/i18n/i18n';
import { NumberSecretRow } from '@/features/messaging/numbers/form/NumberSecretRow';
import { ConfigFieldset } from './ConfigFieldset';
import { ConfigTextField } from './ConfigTextField';
import type { SecretSectionProps } from './config-draft';

const c = t.numbers.evolution.config;
const IDS = ['phone_number_id', 'business_id'] as const;

/** «واجهة ميتا السحابية» (Cloud mode only): Meta's ids; the access token is a number secret. */
export function CloudSection({ value, errors, onChange, view }: SecretSectionProps<'cloud'>) {
  return (
    <ConfigFieldset legend={c.sections.cloud}>
      {IDS.map((id) => (
        <ConfigTextField
          key={id}
          ltr
          label={c.cloud[id]}
          error={errors[`cloud.${id}`]}
          value={value[id]}
          onChange={(v) => onChange({ [id]: v })}
        />
      ))}
      <p className="text-xs text-ink-3">{c.cloud.tokenHint}</p>
      <NumberSecretRow view={view} name="evolution_cloud_token" manage />
    </ConfigFieldset>
  );
}
