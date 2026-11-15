import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '@/features/people/account/AccountPage';

/** /account — «حسابي»: photo, name, phone, email and password of the signed-in user (R-ACC-01..05). */
export const Route = createFileRoute('/account/')({ component: AccountPage });
