import Svg, { Path } from 'react-native-svg';
import { hiddenIcon } from '../../../chat-ui/icons/icon-line';
import { useTheme } from '../../../theme';

/** The closed card's gold diamond (ChatXClosed): 56pt, a solid edge round a dotted one. */
export function DiamondOrnament() {
  const { color } = useTheme();
  return (
    <Svg {...hiddenIcon} width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Path d="M28 3l25 25-25 25L3 28z" stroke={color.gold} strokeWidth={1.5} />
      <Path
        d="M28 13l15 15-15 15-15-15z"
        stroke={color.gold}
        strokeWidth={1}
        strokeDasharray="1.5 3"
      />
    </Svg>
  );
}
