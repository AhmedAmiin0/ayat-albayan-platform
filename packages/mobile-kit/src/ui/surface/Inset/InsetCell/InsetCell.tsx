import { View } from 'react-native';
import { useTheme } from '../../../../theme';
import { InsetContext } from '../inset-context';
import { cellStyle } from '../inset.helpers';
import type { InsetCellProps } from './InsetCell.types';

/** A virtualised row inside the card (LazyList / useInsetRows wrap each item in one). */
export function InsetCell({ place, children }: InsetCellProps) {
  const { color } = useTheme();
  return (
    <InsetContext value>
      <View testID="inset-cell" style={cellStyle(color, place)}>
        {children}
      </View>
    </InsetContext>
  );
}
