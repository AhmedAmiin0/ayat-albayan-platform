import { createFileRoute } from '@tanstack/react-router';
import { TranslationsPage } from '@/features/platform/translations/TranslationsPage';

/** /admin/translations «الترجمات»: override any UI text in Arabic or English (admin only). */
export const Route = createFileRoute('/admin/(ops)/translations')({
  component: TranslationsPage,
});
