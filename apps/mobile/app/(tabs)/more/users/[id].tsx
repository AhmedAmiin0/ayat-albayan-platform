import { usePermissions } from '@/auth/use-permissions';
import { UserDetailScreen } from '@/users/screens/UserDetailScreen';

export default function UserRoute() {
  return <UserDetailScreen can={usePermissions()} />;
}
