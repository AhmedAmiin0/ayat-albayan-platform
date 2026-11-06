import { CheckField } from '@/components/settings/fields/CheckField';
import { t } from '@/lib/i18n/i18n';
import { ConfigFieldset } from './ConfigFieldset';
import { ConfigTextField } from './ConfigTextField';
import { toggleHook, type SectionProps } from './config-draft';
import { WebhookEvents } from './WebhookEvents';

const w = t.numbers.evolution.config.webhook;

export interface WebhookSectionProps extends SectionProps<'webhook'> {
  /** Our route for this instance (/webhooks/evolution/<instance>), named in the hint. */
  path: string;
  /** The full suggested URL, filled in when events are turned on with an empty field. */
  suggestion: string;
}

/** «إشعارات الأحداث» (Evolution's /webhook/set): on / off, the URL, its options and events. */
export function WebhookSection(props: WebhookSectionProps) {
  const { value, errors, onChange, path, suggestion } = props;
  return (
    <ConfigFieldset legend={t.numbers.evolution.config.sections.webhook}>
      <CheckField
        label={w.enabled}
        checked={value.enabled}
        onChange={() => onChange(toggleHook(value, suggestion))}
      />
      <ConfigTextField
        ltr
        label={w.url}
        hint={w.urlHint.replace('{{path}}', path)}
        error={errors['webhook.url']}
        value={value.url}
        onChange={(url) => onChange({ url })}
      />
      <CheckField
        label={w.by_events}
        checked={value.by_events}
        onChange={(by_events) => onChange({ by_events })}
      />
      <CheckField
        label={w.base64}
        checked={value.base64}
        onChange={(base64) => onChange({ base64 })}
      />
      <WebhookEvents
        events={value.events}
        error={errors['webhook.events']}
        onChange={(events) => onChange({ events })}
      />
    </ConfigFieldset>
  );
}
