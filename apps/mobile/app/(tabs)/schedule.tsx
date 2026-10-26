import { useLocalSearchParams } from 'expo-router';
import { DayScheduleScreen } from '@/calendar/screens/DayScheduleScreen';

/** The «الجدول» tab; `?date=YYYY-MM-DD` opens it on that Riyadh day (after a makeup is booked). */
export default function ScheduleTab() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DayScheduleScreen key={date ?? 'today'} {...(date ? { initialDate: date } : {})} />;
}
