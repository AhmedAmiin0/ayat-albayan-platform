import { useId } from 'react';
import { TemplateHealth } from '@/features/templates/TemplateHealth';

/** «القوالب»: the WhatsApp templates per number (health, sync, submit, move), as they were. */
export function TemplatesTab() {
  const heading = useId();
  return (
    <div className="min-w-0">
      <TemplateHealth headingId={heading} />
    </div>
  );
}
