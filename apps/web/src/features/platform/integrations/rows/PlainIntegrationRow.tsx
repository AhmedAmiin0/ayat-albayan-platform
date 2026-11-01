import { integrationEnum, type IntegrationConfigItem } from '@ab/shared';
import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { DeveloperKey } from './DeveloperKey';
import { enumEmptyLabel, integrationText, optionText } from '@/features/platform/integrations/integrations-form';
import { IntegrationSourceNote } from '@/features/platform/integrations/IntegrationSourceNote';

interface Props {
  item: IntegrationConfigItem;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}

/** Free text is LTR code (ids, URLs): monospace. The select shows Arabic labels: never font-mono. */
const fieldClass = 'w-full font-mono text-sm sm:w-[300px]';
const selectClass = 'w-full text-sm sm:w-[300px]';

/**
 * A plain integration value, prefilled with the value in use: free text (an id, a URL, a list) in
 * LTR, or a select for a key with fixed values (the provider, the template sync switch), whose empty
 * choice clears it. Labelled in Arabic; the server's key name only under «للمطوّر».
 */
export function PlainIntegrationRow({ item, value, invalid, onChange }: Props) {
  const words = integrationText(item.key);
  const options = integrationEnum(item.key);
  return (
    <SettingRow
      label={words.label}
      hint={words.hint}
      error={invalid ? t.integrations.invalid : undefined}
      extra={
        <>
          <IntegrationSourceNote item={item} />
          <DeveloperKey name={item.key} />
        </>
      }
    >
      {(p) =>
        options ? (
          <Select {...p} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{enumEmptyLabel(item, options[0] ?? '')}</option>
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
            onChange={(e) => onChange(e.target.value)}
          />
        )
      }
    </SettingRow>
  );
}
