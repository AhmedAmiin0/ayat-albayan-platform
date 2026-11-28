import { integrationEnum, type IntegrationConfigItem } from '@ab/catalog';
import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Input, Select, t } from '@ab/web-kit';
import { DeveloperKey } from './DeveloperKey';
import {
  enumEmptyLabel,
  integrationText,
  optionText,
} from '@/features/platform/integrations/integrations-form';
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

/** An empty choice in a fixed-values select clears the value. */
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
          <Select
            {...p}
            className={selectClass}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
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
