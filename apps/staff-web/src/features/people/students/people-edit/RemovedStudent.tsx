import { Link } from '@tanstack/react-router';
import { buttonVariants, t } from '@ab/web-kit';

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
