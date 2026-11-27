import { useLocalSearchParams } from 'expo-router';
import { usePortalMe, useRefreshPortal } from '@/portal';
import { packageTitle } from './package-screen.helpers';

export function usePackageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = usePortalMe();
  const refresh = useRefreshPortal();
  return { id, me, refresh, title: packageTitle(me.data, id) };
}
