import { HEADS } from './who.heads';
import type { WhoProps } from './Who.types';

/** Who signed in, by the login's kind. */
export function Who({ home }: WhoProps) {
  const Head = HEADS[home.kind];
  return <Head home={home} />;
}
