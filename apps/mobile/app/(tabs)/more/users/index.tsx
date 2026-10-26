import { usePermissions } from '@/auth/use-permissions';
import { UsersScreen } from '@/users/screens/UsersScreen';

export default function UsersRoute() {
  return <UsersScreen can={usePermissions()} />;
}
