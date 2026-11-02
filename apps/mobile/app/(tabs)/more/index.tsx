import { usePermissions } from '@/core/auth';
import { MoreScreen } from '@/more';

export default function MoreRoute() {
  return <MoreScreen can={usePermissions()} />;
}
