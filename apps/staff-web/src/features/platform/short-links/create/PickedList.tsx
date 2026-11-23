import { fillSlots, type LinkPick } from '@ab/client-core';
import { formatPhone } from '@ab/core';
import type { ReactNode } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { IconButton } from '@ab/web-kit/components/ui/form/icon-button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoleTag } from '@/features/platform/short-links/shared/PersonLine';

const F = t.shortLinks.form;
const PILL =
  'inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-card ps-3 pe-1';

interface PickedListProps {
  people: LinkPick[];
  phones: string[];
  onRemovePerson: (id: string) => void;
  onRemovePhone: (e164: string) => void;
}

interface PillProps {
  children: ReactNode;
  name: string;
  onRemove: () => void;
}

function Pill({ children, name, onRemove }: PillProps) {
  return (
    <li className={PILL}>
      {children}
      <IconButton
        label={fillSlots(F.remove, { name })}
        onClick={onRemove}
        className="size-11 sm:size-7"
      >
        <Icon name="x" />
      </IconButton>
    </li>
  );
}

/** The listed people and numbers as removable pills (board LinkXWebCreate «المحددون»). */
export function PickedList({ people, phones, onRemovePerson, onRemovePhone }: PickedListProps) {
  if (people.length + phones.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {people.map((p) => (
        <Pill key={p.id} name={p.name} onRemove={() => onRemovePerson(p.id)}>
          <span className="text-sm font-semibold">{p.name}</span>
          <RoleTag role={p.role} />
        </Pill>
      ))}
      {phones.map((phone) => (
        <Pill key={phone} name={formatPhone(phone)} onRemove={() => onRemovePhone(phone)}>
          <Ltr className="text-sm font-semibold">{formatPhone(phone)}</Ltr>
          <span className="rounded-sm border border-rule px-1.5 text-[11px] leading-5 text-ink-2">
            {F.unregistered}
          </span>
        </Pill>
      ))}
    </ul>
  );
}
