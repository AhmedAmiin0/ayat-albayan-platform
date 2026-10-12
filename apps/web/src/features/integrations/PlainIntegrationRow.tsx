import type { IntegrationConfigItem } from '@ab/shared';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { SettingRow } from '../messaging/SettingsFields';
import { integrationText } from './integrations-form';
import { IntegrationSourceNote } from './IntegrationSourceNote';

interface Props {
  item: IntegrationConfigItem;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}

/** A plain integration value (an id, a URL, a list): prefilled with the value in use, LTR. */
export function PlainIntegrationRow({ item, value, invalid, onChange }: Props) {
  const words = integrationText(item.key);
  return (
    <SettingRow
      label={words.label}
      hint={words.hint}
      error={invalid ? t.integrations.invalid : undefined}
      extra={<IntegrationSourceNote item={item} />}
    >
      {(p) => (
        <Input
          {...p}
          dir="ltr"
          spellCheck={false}
          autoComplete="off"
          className="w-full font-mono text-sm sm:w-[300px]"
          value={value}
          placeholder={item.key}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </SettingRow>
  );
}
