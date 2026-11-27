import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useFamilyClock, useReportPage } from '@/portal';

/** report/[id]?student=&rec= (rule 12: route params are parsed, never trusted). */
const paramsSchema = z.object({
  id: z.string().min(1),
  student: z.string().min(1),
  rec: z.string().min(1).optional(),
});
export function useReportScreen() {
  const params = paramsSchema.parse(useLocalSearchParams());
  const page = useReportPage(params.id);
  const clock = useFamilyClock();
  const view = page.data;
  return { params, page, clock, view };
}
