import { Button, t } from '@ab/mobile-kit';
import type { OptionsTriggerProps } from './OptionsTrigger.types';

export function OptionsTrigger({ open, render }: OptionsTriggerProps) {
  if (render) return render(open);
  if (!open) return null;
  return <Button variant="secondary" label={t.portal.actions.menuTitle} onPress={open} />;
}
