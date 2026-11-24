import { createFileRoute } from '@tanstack/react-router';
import { AccountPage } from '@/features/people/account/AccountPage';

export const Route = createFileRoute('/account/')({ component: AccountPage });
