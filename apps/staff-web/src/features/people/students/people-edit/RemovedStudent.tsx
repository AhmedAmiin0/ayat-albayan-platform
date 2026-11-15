import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';

/** After «تحويل إلى ولي أمر» on the admin file: the notice, and the way back to «الطلاب». */
export function RemovedStudent({ notice }: { notice: string }) {
  return (
    <div className="grid justify-items-start gap-3">
      <p role="status">{notice}</p>
      <Link to="/admin/students" className={buttonVariants({ variant: 'secondary' })}>
        {t.peopleEdit.backToStudents}
      </Link>
    </div>
  );
}
