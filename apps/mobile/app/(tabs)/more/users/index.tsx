import { usePermissions } from '@ab/mobile-kit';
import { UsersScreen } from '@/users';

export default function UsersRoute() {
  return <UsersScreen can={usePermissions()} />;
}
