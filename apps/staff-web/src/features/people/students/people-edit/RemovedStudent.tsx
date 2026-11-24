import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

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
