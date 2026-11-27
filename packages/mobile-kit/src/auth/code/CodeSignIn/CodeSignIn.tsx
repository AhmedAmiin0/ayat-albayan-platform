import type { CodeSignInProps } from './CodeSignIn.types';
import { CodeStep } from './CodeStep';
import { PhoneStep } from './PhoneStep';
import { useCodeSignIn } from './use-code-sign-in';

/** docs/46 A8: the person types the code; the auth gate swaps the screen on success. */
export function CodeSignIn({ codes, intro, children }: CodeSignInProps) {
  const { flow } = useCodeSignIn({ codes });
  return (
    <>
      {flow.target === null ? (
        <PhoneStep flow={flow} intro={intro} />
      ) : (
        <CodeStep flow={flow} target={flow.target} />
      )}
      {children}
    </>
  );
}
