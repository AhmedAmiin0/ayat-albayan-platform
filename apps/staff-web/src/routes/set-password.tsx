import { createFileRoute } from '@tanstack/react-router';
import { SetPasswordPage } from '@/features/people/users/actions/SetPasswordPage';

/** /set-password: public; invited users land here from the recovery link and type a password. */
export const Route = createFileRoute('/set-password')({ component: SetPasswordPage });
