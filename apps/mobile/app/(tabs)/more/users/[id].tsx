import { usePermissions } from '@/auth';
import { UserDetailScreen } from '@/users';

export default function UserRoute() {
  return <UserDetailScreen can={usePermissions()} />;
}
