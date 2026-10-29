import { useLocalSearchParams } from 'expo-router';
import { SalesScheduleScreen } from '@/sales';

/**
 * «جدول الحلقات» tab; a tap on a lesson opens «تفاصيل الحلقة», which holds every action («ادخل الحلقة»
 * first while it runs). A teacher's «جدولها» from
 * «المعلمون» lands here with ?teacherId, «جدول الغد» of «اليوم» with ?date: the key remounts the
 * screen on that teacher or day.
 */
export default function SalesScheduleRoute() {
  const { teacherId = '', date = '' } = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  return <SalesScheduleScreen key={`${teacherId}|${date}`} asTab />;
}
