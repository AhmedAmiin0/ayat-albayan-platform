import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { studentOf, usePortalMe } from '@/portal';
import { useChildRecordings } from '@/recordings/use-assets';

const paramsSchema = z.object({ id: z.string().min(1) });
export function useRecordingsScreen() {
  const { id } = paramsSchema.parse(useLocalSearchParams());
  const student = studentOf(usePortalMe().data, id);
  const list = useChildRecordings(id);
  return { student, list };
}
