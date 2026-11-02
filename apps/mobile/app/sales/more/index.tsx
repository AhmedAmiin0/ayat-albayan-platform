import { usePermissions } from '@/core/auth';
import { SalesMoreScreen } from '@/sales/app';

export default function SalesMoreRoute() {
  return <SalesMoreScreen can={usePermissions()} />;
}
