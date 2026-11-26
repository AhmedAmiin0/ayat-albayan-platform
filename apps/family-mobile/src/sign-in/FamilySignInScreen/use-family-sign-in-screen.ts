import { useFamilyCodes } from '@/sign-in/use-family-codes';

export function useFamilySignInScreen() {
  const codes = useFamilyCodes();
  return { codes };
}
