import { createFileRoute } from '@tanstack/react-router';
import { TranslationsPage } from '@/features/platform/translations/TranslationsPage';

/** Admin only: overrides any UI text in Arabic or English. */
export const Route = createFileRoute('/admin/(ops)/translations')({
  component: TranslationsPage,
});
