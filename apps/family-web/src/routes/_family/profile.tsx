import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/features/account';
import { WithHome } from '@/features/shell';

export const Route = createFileRoute('/_family/profile')({
  component: () => <WithHome>{(home) => <ProfilePage home={home} />}</WithHome>,
});
