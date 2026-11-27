import { Animated, View } from 'react-native';
import { FilterPills, t } from '@ab/mobile-kit';
import { PANEL } from './child-body.panels';
import type { ChildBodyProps } from './ChildBody.types';
import { useChildBody } from './use-child-body';

export function ChildBody({ student, kind }: ChildBodyProps) {
  const { items, tab, choose, own, motionStyle } = useChildBody({ student, kind });
  return (
    <View style={{ gap: 16 }}>
      <FilterPills
        fit
        items={items}
        value={tab}
        onChange={choose}
        accessibilityLabel={t.portal.childTabs}
      />
      <Animated.View style={[{ gap: 16 }, motionStyle]}>
        {PANEL[tab]({ student, kind, own })}
      </Animated.View>
    </View>
  );
}
