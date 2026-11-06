import { EVOLUTION_PROXY_PROTOCOLS } from '@ab/shared';
import { CheckField } from '@/components/settings/fields/CheckField';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { NumberSecretRow } from '@/features/messaging/numbers/form/NumberSecretRow';
import { ConfigFieldset } from './ConfigFieldset';
import { ConfigTextField } from './ConfigTextField';
import type { SecretSectionProps } from './config-draft';

const p = t.numbers.evolution.config.proxy;

/** «الوكيل» (Evolution's /proxy/set): host, port, protocol, user; the password is a secret. */
export function ProxySection({ value, errors, onChange, view }: SecretSectionProps<'proxy'>) {
  return (
    <ConfigFieldset legend={t.numbers.evolution.config.sections.proxy}>
      <CheckField
        label={p.enabled}
        checked={value.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <ConfigTextField
        ltr
        label={p.host}
        error={errors['proxy.host']}
        value={value.host}
        onChange={(host) => onChange({ host })}
      />
      <ConfigTextField
        numeric
        label={p.port}
        error={errors['proxy.port']}
        value={value.port}
        onChange={(port) => onChange({ port })}
      />
      <Field label={p.protocol}>
        {(c) => (
          <Select
            {...c}
            dir="ltr"
            value={value.protocol}
            onChange={(ev) => {
              const protocol = EVOLUTION_PROXY_PROTOCOLS.find((x) => x === ev.target.value);
              onChange({ protocol: protocol ?? value.protocol });
            }}
          >
            {EVOLUTION_PROXY_PROTOCOLS.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </Select>
        )}
      </Field>
      <ConfigTextField
        ltr
        label={p.username}
        value={value.username}
        onChange={(username) => onChange({ username })}
      />
      <p className="text-xs text-ink-3">{p.passwordHint}</p>
      <NumberSecretRow view={view} name="evolution_proxy_password" manage />
    </ConfigFieldset>
  );
}
