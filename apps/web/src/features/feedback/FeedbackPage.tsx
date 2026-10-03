import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Select } from '@/components/ui/select';
import { teacherOptionsQuery } from '@/features/students/api';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { FEEDBACK_PAGE_SIZE, feedbackListQuery, feedbackSummaryQuery } from './api';
import { FeedbackTable } from './FeedbackTable';
import { TeacherAverages } from './TeacherAverages';
import { FEEDBACK_KINDS, RATINGS, type FeedbackKind } from './types';

/** /admin/feedback «رأيك يهمّنا» (admin): each teacher's average on top, then the answers, filterable. */
export function FeedbackPage() {
  const [teacherId, setTeacherId] = useState('');
  const [kind, setKind] = useState<FeedbackKind | ''>('');
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const teachers = useQuery(teacherOptionsQuery);
  const summary = useQuery(feedbackSummaryQuery);
  const list = useQuery(
    feedbackListQuery({ teacherId: teacherId || undefined, kind: kind || undefined, rating: rating ? Number(rating) : undefined, page }),
  );
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <>
      <PageHead>
        <Cartouche>{t.feedback.title}</Cartouche>
      </PageHead>
      <TeacherAverages
        items={(summary.data ?? []).map((s) => ({
          key: s.teacher.id,
          name: s.teacher.name,
          avg: s.avg_rating,
          n: s.n,
          yesPct: s.recommend_yes_pct,
        }))}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select aria-label={t.feedback.teacher} value={teacherId} onChange={(e) => filter(() => setTeacherId(e.target.value))}>
          <option value="">{t.feedback.allTeachers}</option>
          {(teachers.data ?? []).map((tc) => (
            <option key={tc.id} value={tc.id}>
              {teacherLabel(tc)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t.feedback.kind}
          value={kind}
          onChange={(e) => filter(() => setKind(FEEDBACK_KINDS.find((k) => k === e.target.value) ?? ''))}
        >
          <option value="">{t.feedback.allKinds}</option>
          {FEEDBACK_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.enums.feedbackKind[k]}
            </option>
          ))}
        </Select>
        <Select aria-label={t.feedback.rating} value={rating} onChange={(e) => filter(() => setRating(e.target.value))}>
          <option value="">{t.feedback.rating}</option>
          {RATINGS.map((n) => (
            <option key={n} value={n}>
              {t.feedback.outOf.replace('{n}', String(n))}
            </option>
          ))}
        </Select>
      </div>
      {list.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
      {list.isError && <FormAlert>{t.feedback.listError}</FormAlert>}
      {list.data?.items.length === 0 && <EmptyState title={t.feedback.empty} />}
      {list.data && list.data.items.length > 0 && (
        <>
          <FeedbackTable rows={list.data.items} showTeacher />
          <Pager page={page} total={list.data.total} pageSize={FEEDBACK_PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </>
  );
}
