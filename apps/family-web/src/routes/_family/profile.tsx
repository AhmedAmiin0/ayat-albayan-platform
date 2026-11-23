import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '#/features/account/index.ts';
import { WithHome } from '#/features/shell/index.ts';

/** «الملف الشخصي»: who signed in (read-only), opened from the card on «حسابي». */
export const Route = createFileRoute('/_family/profile')({
  component: () => <WithHome>{(home) => <ProfilePage home={home} />}</WithHome>,
});
