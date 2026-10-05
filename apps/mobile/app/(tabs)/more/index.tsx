import { usePermissions } from '@/auth/use-permissions';
import { MoreScreen } from '@/more/MoreScreen';

export default function MoreRoute() {
  return <MoreScreen can={usePermissions()} />;
}
