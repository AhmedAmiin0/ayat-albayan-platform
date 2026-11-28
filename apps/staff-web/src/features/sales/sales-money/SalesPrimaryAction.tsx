import { Button, Icon, type IconName, IconButton } from '@ab/web-kit';

interface Props {
  label: string;
  icon: IconName;
  compact: boolean;
  onClick: () => void;
}

/** The chat header's one visible action: a small button, an icon on phones (`compact`). */
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
