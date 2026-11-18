import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '@/features/account';
import { WithHome } from '@/features/shell';

export const Route = createFileRoute('/_family/account')({
  component: () => <WithHome>{(home) => <AccountPage home={home} />}</WithHome>,
});
