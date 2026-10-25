import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { HeadActions } from '@/components/ui/layout/head-actions';
import { Icon } from '@/components/ui/display/icon';
import { Toast } from '@/components/ui/overlay/toast';
import { NewMeetingMenu } from '@/features/meetings/NewMeetingMenu';
import { CreateStudentDialog } from '@/features/students/create/CreateStudentDialog';
import { t } from '@/lib/i18n/i18n';

/**
 * The dashboard's quick actions (owner, 2026-10-05): «اجتماع جديد» (the one primary), «إضافة طالب»
 * (the students page's own dialog, right here) and «حجز حلقة» (the booking wizard); on phones the
 * two secondary ones sit behind «⋯» (HeadActions).
 */
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
