import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/features/account';
import { WithHome } from '@/features/shell';

/** «الملف الشخصي»: who signed in (read-only), opened from the card on «حسابي». */
export const Route = createFileRoute('/_family/profile')({
  component: () => <WithHome>{(home) => <ProfilePage home={home} />}</WithHome>,
});
