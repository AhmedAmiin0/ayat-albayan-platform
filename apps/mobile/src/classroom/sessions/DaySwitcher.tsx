import { View } from 'react-native';
import { dayLabel } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';

interface DaySwitcherProps {
  /** YYYY-MM-DD on the Riyadh calendar. */
  date: string;
  isToday: boolean;
  onStep: (days: number) => void;
  onToday: () => void;
}

/** Previous / today / next and the day itself («السبت 3 أكتوبر»), one compact block. */
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
