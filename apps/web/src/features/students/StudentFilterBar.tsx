import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useNarrow } from '@/components/ui/use-narrow';
import { Drawer } from '@/features/schedule/Drawer';
import { t } from '@/lib/i18n';
import { activeFilterCount, type StudentsFilters } from './filters';
import { StudentFilters } from './StudentFilters';

export interface StudentFilterBarProps {
  value: StudentsFilters;
  onChange: (next: StudentsFilters) => void;
}

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <Button variant="ghost" onClick={onClear}>
      <Icon name="x" />
      {t.students.clearFilters}
    </Button>
  );
}

/**
 * The filters inline on wide screens; on phones a «فلاتر» button (with the active count) opens
 * them in a sheet. Changes apply at once (they live in the URL); «مسح الفلاتر» drops them all.
 */
export function StudentFilterBar({ value, onChange }: StudentFilterBarProps) {
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(value);
  const clear = () => onChange({});

  if (!narrow) {
    return (
      <div className="flex flex-wrap items-center gap-2.5">
        <StudentFilters value={value} onChange={onChange} />
        {active > 0 && <ClearButton onClear={clear} />}
      </div>
    );
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <Icon name="sliders" />
        {t.students.filters}
        {active > 0 && <span className="tabular-nums">({active})</span>}
      </Button>
      {active > 0 && !open && <ClearButton onClear={clear} />}
      {open && (
        <Drawer title={t.students.filtersTitle} onClose={() => setOpen(false)}>
          <StudentFilters value={value} onChange={onChange} stacked />
          <div className="flex flex-col gap-2.5">
            <Button onClick={() => setOpen(false)}>{t.students.showResults}</Button>
            {active > 0 && <ClearButton onClear={clear} />}
          </div>
        </Drawer>
      )}
    </>
  );
}
