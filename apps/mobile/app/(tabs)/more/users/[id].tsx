import { usePermissions } from '@/auth/use-permissions';
import { UserDetailScreen } from '@/users/UserDetailScreen';

export default function UserRoute() {
  return <UserDetailScreen can={usePermissions()} />;
}
