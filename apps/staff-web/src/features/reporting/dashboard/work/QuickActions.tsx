import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants, HeadActions, Icon, Toast, t } from '@ab/web-kit';
import { NewMeetingMenu } from '@/features/teaching/meetings/NewMeetingMenu';
import { CreateStudentDialog } from '@/features/people/students/create/CreateStudentDialog';

/** On phones the two secondary actions sit behind the overflow menu (HeadActions). */
export function QuickActions() {
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <HeadActions
        label={t.dashboard.home.quick}
        primary={<NewMeetingMenu />}
        more={
          <>
            <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
              <Icon name="users" />
              {t.dashboard.home.addStudent}
            </Button>
            <Link to="/admin/book" className={buttonVariants({ variant: 'secondary' })}>
              <Icon name="calendar" />
              {t.dashboard.home.book}
            </Link>
          </>
        }
      />
      {adding && (
        <CreateStudentDialog
          onClose={() => setAdding(false)}
          onDone={(message) => {
            setAdding(false);
            setNotice(message);
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
