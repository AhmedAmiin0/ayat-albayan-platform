import { Pressable } from 'react-native';
import type { ListRowTitleProps } from './ListRowTitle.types';
import { TitleLine } from './TitleLine';
import { titleParts } from './list-row-title.helpers';

/**
 * ListRow's first line: the name and the LTR meta beside it. With `link` the name is the row's
 * header: bigger and bolder than the lines below, its own tap target even inside a pressable row.
 */
export function ListRowTitle(props: ListRowTitleProps) {
  const { line, link, slop, pressStyle } = titleParts(props);
  if (!link) return <TitleLine {...line} />;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={link.label}
      onPress={link.onPress}
      hitSlop={{ top: slop, bottom: slop }}
      style={pressStyle}
    >
      <TitleLine {...line} />
    </Pressable>
  );
}
