import { usePermissions } from '@/auth';
import { SalesMoreScreen } from '@/sales-app';

export default function SalesMoreRoute() {
  return <SalesMoreScreen can={usePermissions()} />;
}
