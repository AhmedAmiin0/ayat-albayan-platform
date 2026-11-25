import { OpenSeatChat } from '@/features/teaching/student-channel';
import { t } from '@ab/web-kit';
import { AllStudents } from './AllStudents';
import { MyStudents } from './MyStudents';
import { RegistrationCheckButton } from '@/features/sales/sales/registration/RegistrationCheckButton';
import { ViewHead } from '@/features/sales/sales/ViewHead';

export type StudentsView = 'all' | 'mine';

interface SalesStudentsProps {
  view: StudentsView;
  onView: (view: StudentsView) => void;
  /** A chat notification's student (`?student=`): her chat opens over the list. */
  chat?: { studentId: string; onClose: () => void };
}

export function SalesStudents({ view, onView, chat }: SalesStudentsProps) {
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
      >
        <RegistrationCheckButton />
      </ViewHead>
      {view === 'mine' ? <MyStudents /> : <AllStudents />}
      {chat && <OpenSeatChat studentId={chat.studentId} onClose={chat.onClose} />}
    </>
  );
}
