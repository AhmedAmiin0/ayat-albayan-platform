import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { ReportTextField } from '../../entry/ReportTextField';

export interface NextPlanCardProps {
  /** What the form shows: the teacher's plan, else the suggestion. */
  value: string;
  /** The teacher already wrote a plan: it opens editable. */
  edited: boolean;
  onChange: (plan: string) => void;
}

/** «الحلقة القادمة»: the suggested plan as text; «تعديل الخطة» makes it editable. */
export function NextPlanCard({ value, edited, onChange }: NextPlanCardProps) {
  const v2 = t.reports.v2;
  const [editing, setEditing] = useState(edited);
  return (
    <section aria-label={v2.nextTitle} className="grid content-start gap-2 rounded-lg bg-lapis-wash p-4">
      {editing ? (
        <ReportTextField label={v2.nextTitle} value={value} onChange={onChange} />
      ) : (
        <>
          <h3 className="text-body font-bold">{v2.nextTitle}</h3>
          {value && <p className="text-sm text-ink-2">{value}</p>}
          <Button type="button" variant="ghost" size="sm" className="justify-self-start px-0" onClick={() => setEditing(true)}>
            {v2.editPlan}
          </Button>
        </>
      )}
    </section>
  );
}
