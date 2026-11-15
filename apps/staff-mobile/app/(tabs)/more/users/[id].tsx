import { usePermissions } from '@ab/mobile-kit';
import { UserDetailScreen } from '@/users';

export default function UserRoute() {
  return <UserDetailScreen can={usePermissions()} />;
}
