import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { space, type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import { Checkbox } from './Checkbox';

function Line({ label }: { label: string }) {
  const { color } = useTheme();
  const look = { fontFamily: type.ui[500], fontSize: type.size.body, color: color.ink };
  return <AppText style={look}>{label}</AppText>;
}

/**
 * Every state of the kit Checkbox: unchecked, checked, disabled both ways, a long label, the box
 * at the end, and an LTR row. The theme picks light or dark; nothing moves, so reduced motion
 * needs no variant.
 */
export function CheckboxShowcase() {
  const [on, setOn] = useState(false);
  const c = t.common;
  const rows = [
    { label: c.yes, checked: on, onChange: setOn },
    { label: c.no, checked: !on, onChange: (next: boolean) => setOn(!next) },
    { label: c.unset, checked: false, disabled: true },
    { label: c.saved, checked: true, disabled: true },
    { label: c.forbidden, checked: on, onChange: setOn, side: 'end' as const },
  ];
  return (
    <View style={{ gap: space[2], padding: space[4] }}>
      {rows.map(({ onChange, ...row }) => (
        <Checkbox key={row.label} {...row} onChange={onChange ?? setOn}>
          <Line label={row.label} />
        </Checkbox>
      ))}
      <View style={{ direction: 'ltr' }}>
        <Checkbox label={c.confirm} checked={on} onChange={setOn}>
          <Line label={c.confirm} />
        </Checkbox>
      </View>
    </View>
  );
}
