import { Button } from '@/components/ui/button';

export type AttachmentItem = { key: string; name: string };
type Texts = { attachmentN: string; attachmentRemove: string };
type Props = { items: AttachmentItem[]; texts: Texts; onRemove: (index: number) => void };

/** The chosen files before the save: «مرفق n», the file's name, and a remove button each. */
export function AttachmentItems({ items, texts, onRemove }: Props) {
  if (items.length === 0) return null;
  return (
    <ul className="grid gap-1.5">
      {items.map((item, i) => {
        const label = texts.attachmentN.replace('{n}', String(i + 1));
        return (
          <li key={item.key} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-ink">{label}</span>
            <span className="min-w-0 truncate text-ink-2" dir="auto">
              {item.name}
            </span>
            <Button type="button" variant="ghost" size="sm" aria-label={`${texts.attachmentRemove} ${label}`} onClick={() => onRemove(i)}>
              {texts.attachmentRemove}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
