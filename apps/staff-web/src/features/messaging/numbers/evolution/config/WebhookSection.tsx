import { EVOLUTION_HOOK_ORIGINS } from '@ab/shared';
import { CheckField } from '@/components/settings/fields/CheckField';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { ConfigFieldset } from './ConfigFieldset';
import type { SectionProps } from './config-draft';
import { WebhookEvents } from './WebhookEvents';

const w = t.numbers.evolution.config.webhook;

export interface WebhookSectionProps extends SectionProps<'webhook'> {
  /** The URL the server built for the saved origin and instance (null = origin not set). */
  hookUrl: string | null;
}

/**
 * «إشعارات الأحداث» (Evolution's /webhook/set): on / off, which of our origins, and the events.
 * The URL is the server's, shown read-only (security review: it receives the instance token).
 */
export function WebhookSection({ value, errors, onChange, hookUrl }: WebhookSectionProps) {
  return (
    <ConfigFieldset legend={t.numbers.evolution.config.sections.webhook}>
      <CheckField
        label={w.enabled}
        hint={value.enabled ? undefined : w.offHint}
        checked={value.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <Field label={w.origin}>
        {(p) => (
          <Select
            {...p}
            value={value.origin}
            onChange={(ev) => {
              const origin = EVOLUTION_HOOK_ORIGINS.find((x) => x === ev.target.value);
              onChange({ origin: origin ?? value.origin });
            }}
          >
            {EVOLUTION_HOOK_ORIGINS.map((x) => (
              <option key={x} value={x}>{w.origins[x]}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={w.url} hint={hookUrl === null ? w.urlNone : w.urlHint}>
        {(p) => (
          <Input {...p} readOnly dir="ltr" className="font-mono text-xs" value={hookUrl ?? ''} />
        )}
      </Field>
      <WebhookEvents
        events={value.events}
        error={errors['webhook.events']}
        onChange={(events) => onChange({ events })}
      />
    </ConfigFieldset>
  );
}
