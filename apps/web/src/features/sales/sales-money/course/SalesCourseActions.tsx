import { useState } from 'react';
import { CourseActions } from '@/features/teaching/course-actions';

/**
 * The assistant's course actions on the student's running course (owner 2026-10-30): any
 * student, each behind its key, never over a clash; the result as a status line.
 */
export function SalesCourseActions({
  studentId,
  subscriptionId,
}: {
  studentId: string;
  subscriptionId: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="grid justify-items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <CourseActions
          studentId={studentId}
          subscriptionId={subscriptionId}
          mode="sales"
          onDone={setNotice}
        />
      </div>
      {notice && (
        <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
          {notice}
        </p>
      )}
    </div>
  );
}
