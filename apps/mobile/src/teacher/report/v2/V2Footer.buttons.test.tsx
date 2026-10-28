import { emptyContent, type ReportContent } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { formResponseV2 } from '../testing/fixtures';
import { ReportEntryCardV2 } from './ReportEntryCardV2';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: () => new Promise(() => undefined),
}));

const v2 = t.reports.v2;
const light = palette.light;
const graded: ReportContent = {
  ...emptyContent(),
  segments: [{ kind: 'new', surah: 67, from: 16, to: 22, grade: 'excellent' }],
};

async function open(content: ReportContent) {
  const form = formResponseV2({ report: { content } });
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
}

test('docs/07 §6 form: «أرسل» (filled) then «احفظ مسودة» (outlined) as ONE ButtonRow', async () => {
  await open(emptyContent());
  const cells = within(screen.getByTestId('report-footer-actions')).getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(v2.send)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(v2.saveDraft)).toBeTruthy();
});

test('«احذف هذا المقطع» is a danger button: outlined in the bad tone', async () => {
  await open(graded);
  const [remove] = screen.getAllByRole('button', { name: `${v2.removeSegment} — ${v2.segment.new}` });
  if (!remove) throw new Error('no remove');
  expect(StyleSheet.flatten(remove.props.style)).toMatchObject({ borderWidth: 1, borderColor: light.bad });
});
