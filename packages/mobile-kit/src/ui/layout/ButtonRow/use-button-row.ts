import { Children, isValidElement, useState, type ReactNode } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { rowFits } from '../row-fit';
import { GAP, hasIcon, labelOf } from './button-row.helpers';

export function useButtonRow(children: ReactNode) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(isValidElement);
  const fits = rowFits({
    width,
    labels: items.map(labelOf),
    fontScale,
    gap: GAP,
    icons: items.filter(hasIcon).length,
  });
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return { items, fits, onLayout };
}
