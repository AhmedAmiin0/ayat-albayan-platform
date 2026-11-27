import { Children, Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../../../theme';
import { raisedCard } from '../../surface';
import { InsetContext } from '../inset-context';
import { INSET_RADIUS } from '../inset.helpers';
import { Rule } from '../Rule';
import type { InsetGroupProps } from './InsetGroup.types';

/** A short static group of rows in the card; null or false children are skipped. */
export function InsetGroup({ children, testID }: InsetGroupProps) {
  const { color } = useTheme();
  const rows = Children.toArray(children);
  if (rows.length === 0) return null;
  return (
    <InsetContext value>
      <View
        testID={testID}
        // A border, not raisedCard's outer ring: a scroll view without side padding clips the ring.
        style={{
          ...raisedCard(color, INSET_RADIUS),
          boxShadow: undefined,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: color.rule,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <Rule /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </InsetContext>
  );
}
