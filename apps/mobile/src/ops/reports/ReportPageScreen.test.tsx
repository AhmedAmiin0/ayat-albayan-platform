import type { ReportPageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ReportPageScreen } from './ReportPageScreen';

// Invented data: no real student, teacher or family.
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ reportId: '00000000-0000-4000-8000-0000000000f1' }),
}));

const grades = {
  recitation: null,
  memorization: null,
  revision: null,
  tajweed: null,
  engagement: null,
  commitment: null,
};
const view = (over: Partial<ReportPageView> = {}): ReportPageView => ({
  public_id: 'aaaabbbbccccddddeeeeffff00001111',
  student: { name: 'سهيلة' },
  teacher: { name: 'أبرار' },
  lesson: { starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' },
  tz: 'Asia/Riyadh',
  report: {
    form_version: 1,
    attendance: 'on_time',
    program: 'quran',
    recited: 'الملك',
    new_memorization: null,
    revision: null,
    theory: null,
    grades,
    grade_overall: 'excellent',
    notes: 'أداء ممتاز',
    homework: null,
    next_plan: null,
    content: null,
    version: 1,
    submitted_at: '2026-10-04T15:00:00Z',
    edited_at: null,
  },
  attachments: [
    {
      id: '00000000-0000-4000-8000-0000000000a1',
      mime: 'image/png',
      size: 10,
      url: 'https://files.example/a',
    },
  ],
  pdf: { url: 'https://files.example/report.pdf' },
  ...over,
});

test("the saved report read-only by the report's uuid; a file and the PDF open", async () => {
  mockApiFetch.mockResolvedValue(view());
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<ReportPageScreen />);
  expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/report-pages/by-report/00000000-0000-4000-8000-0000000000f1',
  );
  expect(screen.getByText(t.reportPage.teacher.replace('{name}', 'أبرار'))).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
  await fireEvent.press(
    screen.getByRole('button', { name: t.reportPage.file.replace('{n}', '1') }),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.reportPage.downloadPdf }));
  await waitFor(() => expect(open).toHaveBeenCalledWith('https://files.example/report.pdf'));
  expect(open).toHaveBeenCalledWith('https://files.example/a');
  open.mockRestore();
});

test('the PDF still being prepared: says so, no download button', async () => {
  mockApiFetch.mockResolvedValue(view({ pdf: null }));
  await renderWithQuery(<ReportPageScreen />);
  expect(await screen.findByText(t.reportPage.pdfPending)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.reportPage.downloadPdf })).toBeNull();
});

test('not a reader (404): the not-found words with a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('404'));
  await renderWithQuery(<ReportPageScreen />);
  expect(await screen.findByText(t.reportPage.notFound)).toBeTruthy();
});
