import { createFileRoute } from '@tanstack/react-router';
import { SetPasswordPage } from '@/features/users/actions/SetPasswordPage';

/** /set-password: public; an invited user lands here from the recovery link and types a password. */
export const Route = createFileRoute('/set-password')({ component: SetPasswordPage });
