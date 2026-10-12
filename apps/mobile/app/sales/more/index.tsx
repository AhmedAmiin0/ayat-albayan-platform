import { usePermissions } from '@/auth/use-permissions';
import { SalesMoreScreen } from '@/sales-app/SalesMoreScreen';

export default function SalesMoreRoute() {
  return <SalesMoreScreen can={usePermissions()} />;
}
