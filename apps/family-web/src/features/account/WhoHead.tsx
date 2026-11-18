import type { ReactNode } from 'react';

/** The id both «حسابي» who-cards are labelled by. */
export const WHO_ID = 'account-who';

interface Props {
  /** The icon tile or the initial before the name. */
  mark: ReactNode;
  title: string;
  /** The line under the name (the number, the student code); none: nothing. */
  line?: ReactNode;
}

/** The head of «حسابي»'s who-card (boards PortalWebAccount, …StudentAccount): mark, name, line. */
export function WhoHead({ mark, title, line }: Props) {
  return (
    <div className="flex items-center gap-3.5">
      {mark}
      <div className="grid min-w-0 gap-0.5">
        <h2 id={WHO_ID} className="text-[24px] font-extrabold leading-snug text-ink">
          {title}
        </h2>
        {line && <p className="text-sm text-ink-2">{line}</p>}
      </div>
    </div>
  );
}
