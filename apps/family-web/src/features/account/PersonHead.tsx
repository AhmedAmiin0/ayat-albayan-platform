import type { ReactNode } from 'react';
import { Avatar } from '@ab/web-kit/components/ui/display/avatar';
import { Card } from '@ab/web-kit/components/ui/surface/card';

interface Props {
  /** The person's name, or only the role word when the name is not known. */
  name: string;
  /** The small role label above the name; without it, no avatar either (no name to draw). */
  role?: string;
  /** The line under the name: the WhatsApp number or the student's code. */
  detail?: ReactNode;
}

/** «حسابي»'s person heading: the initial, the role, the name and one line under it. */
export function PersonHead({ name, role, detail }: Props) {
  return (
    <Card className="flex items-center gap-4 p-4">
      {role && <Avatar name={name} size="lg" decorative />}
      <div className="grid min-w-0 gap-0.5">
        {role && <p className="text-xs font-medium text-ink-3">{role}</p>}
        <h2 className="font-display text-h3 font-bold">{name}</h2>
        {detail && <p className="text-sm text-ink-2">{detail}</p>}
      </div>
    </Card>
  );
}
