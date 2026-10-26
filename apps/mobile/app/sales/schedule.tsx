import { useLocalSearchParams } from 'expo-router';
import { SalesScheduleScreen } from '@/sales';

/**
 * «جدول الحلقات» tab (read-only, «ادخل الحلقة» on a running lesson). A teacher's «جدولها» from
 * «المعلمون» lands here with ?teacherId: the key remounts the screen on that teacher.
 */
export default function SalesScheduleRoute() {
  const { teacherId = '' } = useLocalSearchParams<{ teacherId?: string }>();
  return <SalesScheduleScreen key={teacherId} asTab />;
}
