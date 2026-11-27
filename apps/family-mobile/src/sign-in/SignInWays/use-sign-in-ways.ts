import { t, useA11yPref, useStepMotion } from '@ab/mobile-kit';
import { firstWay, OTHER_WAY, type SignInWay, WAY_DIRECTION } from '@ab/client-core';
import type { SignInWaysProps } from './SignInWays.types';

const SWITCH: Record<SignInWay, () => string> = {
  whatsapp: () => t.familyApp.signIn.withWhatsApp,
  password: () => t.familyApp.signIn.withPassword,
};

export function useSignInWays({ codes }: SignInWaysProps) {
  const still = useA11yPref('reduceMotion');
  const motion = useStepMotion<SignInWay>(firstWay(codes), still);
  const other = OTHER_WAY[motion.current];
  const switchLabel = SWITCH[other]();
  const switchWay = () => motion.go(other, WAY_DIRECTION[other]);
  return { still, motion, switchLabel, switchWay };
}
