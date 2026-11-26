import { Pressable } from 'react-native';
import { t } from '../../../../lib/i18n/i18n';
import { slotTimes, type ViewerClock } from '../../../../lib/time/slots/slot-text';
import { shape, type, useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';

export interface SlotButtonProps {
  startsAt: string;
  /** The student's zone: the small clock under the viewer's time when it differs. */
  tz: string;
  /** The viewer's zone and 12 / 24 h cycle (staff: theirs; the family: the student's clock). */
  viewer: ViewerClock;
  selected: boolean;
  onPick: (startsAt: string) => void;
  /** One of several (radio, the default), a pick among many (checkbox), or a plain button. */
  role?: 'radio' | 'checkbox' | 'button';
}

/** A free start: big viewer time, the student's clock under it; picked = inverse (docs/07 §6). */
export function SlotButton(props: SlotButtonProps) {
  const { startsAt, tz, viewer, selected, onPick, role = 'radio' } = props;
  const { color } = useTheme();
  const { main, local } = slotTimes(startsAt, tz, viewer);
  const ink = selected ? color.onInverse : color.ink;
  const body = type.size.body;
  const numbers = { fontVariant: ['tabular-nums' as const] };
  const idle = (pressed: boolean) => (pressed ? color.sunk : color.raised);
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'button' ? {} : { checked: selected }}
      accessibilityLabel={local ? `${main}${t.common.listSeparator}${local}` : main}
      onPress={() => onPick(startsAt)}
      style={({ pressed }) => ({
        minHeight: shape.control.touch,
        minWidth: 88,
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: selected ? color.inverse : color.ruleInput,
        backgroundColor: selected ? color.inverse : idle(pressed),
      })}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: body, color: ink, ...numbers }}>
        {main}
      </AppText>
      {local ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size['2xs'],
            color: selected ? color.onInverse : color.ink2,
            ...numbers,
          }}
        >
          {local}
        </AppText>
      ) : null}
    </Pressable>
  );
}
