import { createFileRoute } from '@tanstack/react-router';
import { SetPasswordPage } from '@/features/people/users/actions/SetPasswordPage';

/** /set-password: public; an invited user lands here from the recovery link to set a password. */
export const Route = createFileRoute('/set-password')({ component: SetPasswordPage });
