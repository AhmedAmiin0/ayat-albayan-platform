import { usePermissions } from '@/core/auth';
import { UsersScreen } from '@/users';

export default function UsersRoute() {
  return <UsersScreen can={usePermissions()} />;
}
