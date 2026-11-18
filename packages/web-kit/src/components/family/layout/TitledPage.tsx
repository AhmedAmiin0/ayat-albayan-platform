import type { ReactNode } from 'react';
import { Hero, HeroTitle } from './Hero';
import { PageBody } from './PageBody';

interface Props {
  /** The h1's id; the band is labelled by it. */
  id: string;
  title: string;
  line?: string;
  children: ReactNode;
}

/** A family page with a plain titled band (account, children, reports, schedule, alerts). */
export function TitledPage({ id, title, line, children }: Props) {
  return (
    <>
      <Hero labelledBy={id}>
        <HeroTitle id={id} title={title} line={line} />
      </Hero>
      <PageBody>{children}</PageBody>
    </>
  );
}
