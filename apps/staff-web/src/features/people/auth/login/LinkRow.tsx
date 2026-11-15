import { Button } from '@/components/ui/form/button';

export interface LinkItem {
  label: string;
  onClick: () => void;
}

/** Quiet links under a form: «نسيت كلمة المرور؟», «أول دخول؟», «الدخول باسم المستخدم». */
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
