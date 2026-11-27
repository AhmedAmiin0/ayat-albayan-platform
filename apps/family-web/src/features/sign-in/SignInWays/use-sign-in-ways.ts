import { firstWay, OTHER_WAY, type SignInWay } from '@ab/client-core';
import { useState } from 'react';
import { t } from '@ab/web-kit';

const SWITCH: Readonly<Record<SignInWay, () => string>> = {
  whatsapp: () => t.familyApp.signIn.withWhatsApp,
  password: () => t.familyApp.signIn.withPassword,
};

export function useSignInWays(codes: boolean) {
  const [way, setWay] = useState<SignInWay>(firstWay(codes));
  const other = OTHER_WAY[way];
  const byWhatsApp = way === 'whatsapp';
  const switchLabel = SWITCH[other]();
  const switchWay = () => setWay(other);
  return { way, byWhatsApp, switchLabel, switchWay };
}
