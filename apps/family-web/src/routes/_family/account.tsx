import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '#/features/account/index.ts';
import { WithHome } from '#/features/shell/index.ts';

export const Route = createFileRoute('/_family/account')({
  component: () => <WithHome>{(home) => <AccountPage home={home} />}</WithHome>,
});
