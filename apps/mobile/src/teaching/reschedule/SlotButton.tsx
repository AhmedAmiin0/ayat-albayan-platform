import { Pressable } from 'react-native';
import { slotTimes } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

export interface SlotButtonProps {
  startsAt: string;
  /** The family's zone: the small clock under the Riyadh time. */
  tz: string;
  selected: boolean;
  onPick: (startsAt: string) => void;
  /** One of several (radio, the default), a pick among many (checkbox), or a plain button. */
  role?: 'radio' | 'checkbox' | 'button';
}

/** A free start: big local time, the student's clock under it; picked = inverse (docs/07 §6). */
export function SlotButton({ startsAt, tz, selected, onPick, role = 'radio' }: SlotButtonProps) {
  const cycle = useClockCycle();
  const viewerZone = useViewerTz();
  const viewer = { tz: viewerZone, cycle };
  const { color } = useTheme();
  const { main, local } = slotTimes(startsAt, tz, viewer);
  const ink = selected ? color.onInverse : color.ink;
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
        backgroundColor: selected ? color.inverse : pressed ? color.sunk : color.raised,
      })}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: ink, fontVariant: ['tabular-nums'] }}>
        {main}
      </AppText>
      {local ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size['2xs'],
            color: selected ? color.onInverse : color.ink2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {local}
        </AppText>
      ) : null}
    </Pressable>
  );
}
