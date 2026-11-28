import { Button } from '@ab/web-kit/components/ui/form/Button';
import type { StopButtonProps } from './StopButton.types';

export function StopButton({ label, onStop }: StopButtonProps) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onStop}>
      {label}
    </Button>
  );
}
