import type { ProfileFact } from '@ab/client-core';
import { Ltr } from '@ab/web-kit';

/** A phone, email or code reads left to right in an isolate; a name in the page's direction. */
export function FactValue({ fact }: { fact: ProfileFact }) {
  return fact.ltr ? <Ltr>{fact.value}</Ltr> : <>{fact.value}</>;
}
