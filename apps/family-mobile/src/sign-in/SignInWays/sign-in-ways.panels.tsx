import type { ReactNode } from 'react';
import type { SignInWay } from '@ab/client-core';
import { StudentSignIn } from '@/sign-in/password';
import { WhatsAppSignIn } from '@/sign-in/whatsapp';

export const WAYS: Record<SignInWay, (codes: boolean) => ReactNode> = {
  whatsapp: () => <WhatsAppSignIn />,
  password: (codes) => <StudentSignIn codes={codes} />,
};
