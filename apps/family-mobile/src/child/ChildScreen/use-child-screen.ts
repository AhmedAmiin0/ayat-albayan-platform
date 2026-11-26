import { useLocalSearchParams } from 'expo-router';
import { studentOf, usePortalMe, useRefreshPortal } from '@/portal';

export function useChildScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  const student = studentOf(me.data, id);
  return { id, me, refresh, student };
}
