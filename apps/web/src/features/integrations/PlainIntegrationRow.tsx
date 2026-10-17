import { integrationEnum, type IntegrationConfigItem } from '@ab/shared';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { SettingRow } from '../messaging/SettingsFields';
import { integrationText, optionText } from './integrations-form';
import { IntegrationSourceNote } from './IntegrationSourceNote';

interface Props {
  item: IntegrationConfigItem;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}

const fieldClass = 'w-full font-mono text-sm sm:w-[300px]';

/**
 * A plain integration value, prefilled with the value in use: free text (an id, a URL, a list) in
 * LTR, or a select for a key with fixed values (the WhatsApp provider), whose empty choice clears it.
 */
export function PlainIntegrationRow({ item, value, invalid, onChange }: Props) {
  const words = integrationText(item.key);
  const options = integrationEnum(item.key);
  return (
    <SettingRow
      label={words.label}
      hint={words.hint}
      error={invalid ? t.integrations.invalid : undefined}
      extra={<IntegrationSourceNote item={item} />}
    >
      {(p) =>
        options ? (
          <Select {...p} className={fieldClass} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t.integrations.enumDefault.replace('{value}', optionText(options[0] ?? ''))}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {optionText(o)}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            {...p}
            dir="ltr"
            spellCheck={false}
            autoComplete="off"
            className={fieldClass}
            value={value}
            placeholder={item.key}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </SettingRow>
  );
}
