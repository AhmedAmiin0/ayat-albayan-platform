import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/features/legal';

/** Public (outside _family): linked from Google Play and the app. */
export const Route = createFileRoute('/privacy')({
  component: () => <LegalPage page="privacy" />,
});
