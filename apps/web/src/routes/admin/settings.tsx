import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/features/messaging/SettingsPage';

/** /admin/settings — messaging switch, WhatsApp template health, academy settings (R-MSG-01). */
export const Route = createFileRoute('/admin/settings')({
  component: SettingsPage,
});
