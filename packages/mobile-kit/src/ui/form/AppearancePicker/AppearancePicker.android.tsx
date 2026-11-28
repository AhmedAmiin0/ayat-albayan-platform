import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text } from '@expo/ui/jetpack-compose';
import {
  defaultMinSize,
  fillMaxWidth,
  semantics,
  testID,
} from '@expo/ui/jetpack-compose/modifiers';
import { shape } from '../../../theme';
import { ExpoHost } from '../../surface/ExpoHost';
import { Section } from '../../surface/Section';
import { useAppearancePicker } from './use-appearance-picker';

/**
 * Material 3's segmented buttons in the pill colours, as in the system's own display settings:
 * TalkBack reads the row as a radio group and each segment as a radio, as it read the pills.
 */
export function AppearancePicker() {
  const { pref, choose, items, label, colors, labelStyle } = useAppearancePicker();
  return (
    <Section title={label}>
      <ExpoHost testID="appearance-host" matchContents={{ vertical: true }}>
        <SingleChoiceSegmentedButtonRow
          modifiers={[
            fillMaxWidth(),
            defaultMinSize({ minHeight: shape.control.touch }),
            semantics({ contentDescription: label }),
          ]}
        >
          {items.map((item) => (
            <SegmentedButton
              key={item.value}
              selected={item.value === pref}
              onClick={() => choose(item.value)}
              colors={colors}
              modifiers={[testID(`appearance-${item.value}`)]}
            >
              <SegmentedButton.Label>
                <Text style={labelStyle}>{item.label}</Text>
              </SegmentedButton.Label>
            </SegmentedButton>
          ))}
        </SingleChoiceSegmentedButtonRow>
      </ExpoHost>
    </Section>
  );
}
