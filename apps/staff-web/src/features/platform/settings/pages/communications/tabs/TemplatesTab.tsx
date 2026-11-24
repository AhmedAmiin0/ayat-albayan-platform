import { useId } from 'react';
import { TemplateHealth } from '@/features/messaging/templates/TemplateHealth';

export function TemplatesTab() {
  const heading = useId();
  return (
    <div className="min-w-0">
      <TemplateHealth headingId={heading} />
    </div>
  );
}
