import { Card } from '#/components/ui/surface/index.ts';
import { LEGAL_LIST_CLASS } from '#/components/legal/legal-look.ts';
import type { LegalSectionProps } from './LegalSection.types';

/** One titled part of a legal page: a card with its heading, a paragraph, points, then extras. */
export function LegalSection(props: LegalSectionProps) {
  const { id, title, body, items = [], ordered, children } = props;
  const headingId = `legal-${id}`;
  const List = ordered ? 'ol' : 'ul';
  return (
    <Card asChild>
      <section aria-labelledby={headingId} className="grid gap-3 p-5 text-body leading-relaxed">
        <h2 id={headingId} className="font-display text-h4 font-bold">
          {title}
        </h2>
        {body ? <p className="text-pretty">{body}</p> : null}
        {items.length > 0 ? (
          <List className={`grid gap-2 ps-5 ${LEGAL_LIST_CLASS[List]}`}>
            {items.map((item) => (
              <li key={item} className="text-pretty">
                {item}
              </li>
            ))}
          </List>
        ) : null}
        {children}
      </section>
    </Card>
  );
}
