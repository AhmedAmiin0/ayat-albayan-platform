import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { report, student } from '@/portal/portal.fixtures';
import { ReportRow } from './ReportRow';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const kid = student();
const sent = new Date('2026-11-04T15:00:00Z');

test('an unseen report with a recording: the new mark, the teacher and the recording note', async () => {
  await render(<ReportRow report={report(sent, { recording_id: 'rec1' })} student={kid} />);
  expect(screen.getByText(t.portal.newReport)).toBeTruthy();
  expect(screen.getByText(t.portal.app.history.recording)).toBeTruthy();
  expect(screen.getByText(t.portal.reportTitle)).toBeTruthy();
});

test('opening it goes to the report page and clears the new mark', async () => {
  await render(<ReportRow report={report(sent, { id: 'r-open' })} student={kid} />);
  await fireEvent.press(screen.getByRole('button', { name: t.portal.openReport }));
  expect(router.push).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(t.portal.newReport)).toBeNull();
  expect(screen.queryByText(t.portal.app.history.recording)).toBeNull();
});
