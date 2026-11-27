import { useCodeFlow } from '../use-code-flow';
import type { CodeSignInProps } from './CodeSignIn.types';

export function useCodeSignIn({ codes }: Pick<CodeSignInProps, 'codes'>) {
  const flow = useCodeFlow(codes);
  return { flow };
}
