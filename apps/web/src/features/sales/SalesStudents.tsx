import { t } from '@/lib/i18n';
import { AllStudents } from './AllStudents';
import { MyStudents } from './MyStudents';
import { ViewHead } from './ViewHead';

export type StudentsView = 'all' | 'mine';

/** /sales/students «الطلاب»: every student of the academy, or «طلابي» (the ones I brought, with my commission). */
export function SalesStudents({ view, onView }: { view: StudentsView; onView: (view: StudentsView) => void }) {
  return (
    <>
      <ViewHead
        title={t.sales.nav.allStudents}
        label={t.sales.views.students}
        value={view}
        onChange={onView}
        options={[
          { value: 'all', label: t.sales.allStudents.title },
          { value: 'mine', label: t.assistantPortal.nav.students },
        ]}
      />
      {view === 'mine' ? <MyStudents /> : <AllStudents />}
    </>
  );
}
