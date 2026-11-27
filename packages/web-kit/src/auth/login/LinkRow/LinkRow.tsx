import { Button } from '@ab/web-kit/components/ui/form/Button';
import type { LinkRowProps } from './LinkRow.types';

export function LinkRow({ links }: LinkRowProps) {
  return (
    <div className="-mx-3 flex flex-wrap items-center justify-start gap-x-2 gap-y-1">
      {links.map((link) => (
        <Button key={link.label} type="button" variant="ghost" size="sm" onClick={link.onClick}>
          {link.label}
        </Button>
      ))}
    </div>
  );
}
