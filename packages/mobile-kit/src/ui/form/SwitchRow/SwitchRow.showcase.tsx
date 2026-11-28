import { useState } from 'react';
import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { space } from '../../../theme';
import { SwitchRow } from './SwitchRow';

/**
 * Every state of the kit SwitchRow: off, on, disabled both ways and an LTR row. The theme picks
 * light or dark; the thumb's slide follows the system's animation setting, so reduced motion
 * needs no variant. The system switch keeps its 44pt target and switch role.
 */
export function SwitchRowShowcase() {
  const [on, setOn] = useState(false);
  const c = t.common;
  return (
    <View style={{ gap: space[2] }}>
      <SwitchRow label={c.yes} value={on} onChange={setOn} />
      <SwitchRow label={c.no} value={!on} onChange={(next) => setOn(!next)} />
      <SwitchRow label={c.unset} value={false} disabled onChange={setOn} />
      <SwitchRow label={c.saved} value disabled onChange={setOn} />
      <View style={{ direction: 'ltr' }}>
        <SwitchRow label={c.confirm} value={on} onChange={setOn} />
      </View>
    </View>
  );
}
