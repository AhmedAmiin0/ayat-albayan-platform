import { usePermissions } from '@/auth/use-permissions';
import { MoreScreen } from '@/more/screens/MoreScreen';

export default function MoreRoute() {
  return <MoreScreen can={usePermissions()} />;
}
