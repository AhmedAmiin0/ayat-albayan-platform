import { View } from 'react-native';
import { dayLabel } from '@/calendar';
import { t, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';

interface DaySwitcherProps {
  /** YYYY-MM-DD on the Riyadh calendar. */
  date: string;
  isToday: boolean;
  onStep: (days: number) => void;
  onToday: () => void;
}

export function DaySwitcher({ date, isToday, onStep, onToday }: DaySwitcherProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <AppText accessibilityRole="header" style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {dayLabel(date)}
      </AppText>
      <ButtonRow>
        <Button variant="secondary" label={t.schedule.prevDay} onPress={() => onStep(-1)} />
        <Button variant="secondary" label={t.schedule.today} disabled={isToday} onPress={onToday} />
        <Button variant="secondary" label={t.schedule.nextDay} onPress={() => onStep(1)} />
      </ButtonRow>
    </View>
  );
}
