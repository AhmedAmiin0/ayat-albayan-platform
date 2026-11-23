import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '#/features/legal/index.ts';

/** «حذف الحساب وبياناته»: public (outside _family), Google Play's account deletion URL. */
export const Route = createFileRoute('/delete-account')({
  component: () => <LegalPage page="deleteAccount" />,
});
