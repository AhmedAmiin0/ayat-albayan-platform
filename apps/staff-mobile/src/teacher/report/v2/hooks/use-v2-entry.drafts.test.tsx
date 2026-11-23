import AsyncStorage from '@react-native-async-storage/async-storage';
import { v2DraftBody, v2ValuesOf } from '@ab/shared';
import arBundle from '@ab/shared/i18n/ar.json';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { readStoredDraft, REPORT_DRAFTS_KEY } from '@/teacher/report/drafts';
import { formResponseV2, reportView } from '@/teacher/report/testing/fixtures';
import { useV2Entry } from './use-v2-entry';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: jest.fn(),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

const SEGMENT = { kind: 'recited', surah: 67, from: 1, to: 5, grade: 'excellent' };
const entry = () => {
  const [first] = formResponseV2().entries;
  if (!first) throw new Error('fixture has one entry');
  return first;
};
const words = [arBundle.reports.v2.suggest, arBundle.reports.v2.suggest];
const serverBody = () =>
  JSON.stringify(v2DraftBody(v2ValuesOf(entry().report, entry().student.program, words)));
const open = () =>
  renderHook(() => useV2Entry(entry()), { wrapper: queryWrapper(createTestQueryClient()) });

beforeEach(async () => {
  mockApiSend.mockReset();
  await AsyncStorage.clear();
});

test('after an app restart the typed v2 content and notes are shown', async () => {
  const kept = { attendance: 'on_time', program: 'quran', content: { segments: [SEGMENT] }, notes: 'ممتاز' };
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': { body: JSON.stringify(kept), base: serverBody() } }));
  mockApiSend.mockImplementation(async () => reportView({ form_version: 2 }));
  const { result } = await open();
  await waitFor(() => expect(result.current.values.notes).toBe('ممتاز'));
  expect(result.current.values.content.segments).toEqual([SEGMENT]);
  expect(result.current.values.attendance).toBe('on_time');
});

test('a successful v2 send clears the stored draft', async () => {
  await AsyncStorage.setItem(REPORT_DRAFTS_KEY, JSON.stringify({ 'r-1': { body: '{"notes":"x"}', base: serverBody() } }));
  mockApiSend.mockImplementation(async (m: string) =>
    reportView({ form_version: 2, ...(m === 'POST' ? { status: 'submitted', version: 1 } : {}) }),
  );
  const { result } = await open();
  await act(() => result.current.update({ attendance: 'absent' }));
  await act(() => result.current.send());
  await waitFor(() => expect(result.current.report.status).toBe('submitted'));
  await waitFor(async () => expect(await readStoredDraft('r-1')).toBeNull());
});
