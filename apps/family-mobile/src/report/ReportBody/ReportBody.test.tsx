import { render, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { reportPage } from '@/portal/portal.fixtures';
import { ReportBody } from './ReportBody';

test('the overall grade, the teacher, a filled line and a blank one', async () => {
  await render(<ReportBody view={reportPage()} />);
  const graded = screen.getAllByText(t.enums.grade.excellent).length;
  expect(graded).toBeGreaterThan(0);
  expect(screen.getByText(t.reportPage.teacher.replace('{name}', 'فاطمة'))).toBeTruthy();
  expect(screen.getByText('مراجعة سورة الملك')).toBeTruthy();
  expect(screen.getAllByText(t.portal.app.report.blank).length).toBeGreaterThan(0);
  expect(screen.queryByText(t.reportPage.edited)).toBeNull();
});

test('no overall grade: one grade text fewer; an edited report says so', async () => {
  await render(<ReportBody view={reportPage()} />);
  const graded = screen.getAllByText(t.enums.grade.excellent).length;
  await render(
    <ReportBody view={reportPage({ grade_overall: null, edited_at: '2026-11-05T09:00:00Z' })} />,
  );
  expect(screen.queryAllByText(t.enums.grade.excellent).length).toBeLessThan(graded);
  expect(screen.getByText(t.reportPage.edited)).toBeTruthy();
});
