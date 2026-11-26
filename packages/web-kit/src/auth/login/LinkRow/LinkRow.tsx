import { Button } from '@ab/web-kit/components/ui/form/Button';

export interface LinkItem {
  label: string;
  onClick: () => void;
}

export function LinkRow({ links }: { links: LinkItem[] }) {
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
