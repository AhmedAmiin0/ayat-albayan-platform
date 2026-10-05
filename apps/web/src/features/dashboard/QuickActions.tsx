import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Toast } from '@/components/ui/toast';
import { NewMeetingMenu } from '@/features/meetings/NewMeetingMenu';
import { CreateStudentDialog } from '@/features/students/CreateStudentDialog';
import { t } from '@/lib/i18n';

/**
 * The dashboard's quick actions (owner, 2026-10-05): «اجتماع جديد» (the one primary), «إضافة طالب»
 * (the students page's own dialog, right here) and «حجز حلقة» (the booking wizard).
 */
export function QuickActions() {
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div role="group" aria-label={t.dashboard.home.quick} className="ms-auto flex flex-wrap items-center gap-2.5 max-sm:w-full">
      <NewMeetingMenu />
      <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
        <Icon name="users" />
        {t.dashboard.home.addStudent}
      </Button>
      <Link to="/admin/book" className={buttonVariants({ variant: 'secondary' })}>
        <Icon name="calendar" />
        {t.dashboard.home.book}
      </Link>
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
    </div>
  );
}
