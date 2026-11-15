import { Button } from '@/components/ui/form/button';
import { Icon, type IconName } from '@/components/ui/display/icon';
import { IconButton } from '@/components/ui/form/icon-button';

type Props = { label: string; icon: IconName; compact: boolean; onClick: () => void };

/** The sales chat header's one visible action: a small secondary button, an icon button on phones (`compact`). */
export function SalesPrimaryAction({ label, icon, compact, onClick }: Props) {
  if (compact) {
    return (
      <IconButton label={label} onClick={onClick} className="text-lapis">
        <Icon name={icon} />
      </IconButton>
    );
  }
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick}>
      <Icon name={icon} />
      {label}
    </Button>
  );
}
