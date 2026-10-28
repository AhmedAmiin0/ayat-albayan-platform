import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { startDraft } from './picker-state';
import { SurahPickerSheet } from './SurahPickerSheet';

const p = t.reports.v2.picker;
const onDone = jest.fn();

async function open(
  start = startDraft({ current: null, last: null }),
  recent: number[] = [67, 68],
) {
  await render(
    <SurahPickerSheet
      title="الحفظ الجديد"
      start={start}
      recent={recent}
      onCancel={jest.fn()}
      onDone={onDone}
    />,
  );
}

const stepperValue = (label: string) => screen.getByLabelText(label).props.value;

beforeEach(() => jest.clearAllMocks());

test('no history: nothing picked and «تمّ» waits for a surah', async () => {
  await open();
  expect(screen.getByText('الحفظ الجديد')).toBeTruthy();
  expect(screen.getByRole('button', { name: p.done }).props.accessibilityState).toMatchObject({
    disabled: true,
  });
  expect(screen.getByLabelText('1 · سورة الفاتحة · 7 آية · ج 1')).toBeTruthy();
});

test('search by name or number narrows the list; no match says so', async () => {
  await open();
  await fireEvent.changeText(screen.getByLabelText(p.search), 'الملك');
  expect(screen.getByLabelText(/^67 · سورة الملك/)).toBeTruthy();
  expect(screen.queryByLabelText(/^1 · سورة الفاتحة/)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(p.search), '68');
  expect(screen.getByLabelText(/^68 · سورة القلم · 52 آية · ج 29/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(p.search), 'zzz');
  expect(screen.getByText(p.noMatch)).toBeTruthy();
});

test('a recent surah chip picks the whole surah; «تمّ» writes that range', async () => {
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: 'القلم' }));
  expect(stepperValue(p.from)).toBe('1');
  expect(stepperValue(p.to)).toBe('52');
  expect(screen.getByText(/^52 آية · الصفحة 564–566 · الجزء 29\.$/)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: p.done }));
  expect(onDone).toHaveBeenCalledWith({ surah: 68, from: 1, to: 52 });
});

test('starts right after the last saved ayah and says so', async () => {
  await open(startDraft({ current: null, last: { surah: 67, from: 1, to: 15 } }));
  expect(stepperValue(p.from)).toBe('16');
  expect(stepperValue(p.to)).toBe('30');
  expect(
    screen.getByText(new RegExp(p.afterLast.replace('{ayah}', '15').replace(/[().]/g, '\\$&'))),
  ).toBeTruthy();
});

test('the steppers clamp to the surah and keep from ≤ to; a typed number too', async () => {
  await open(startDraft({ current: { surah: 67, from: 29, to: 30 }, last: null }));
  const [fromDec, toDec] = screen.getAllByRole('button', { name: p.dec });
  const [fromInc, toInc] = screen.getAllByRole('button', { name: p.inc });
  if (!fromDec || !toDec || !fromInc || !toInc) throw new Error('steppers');
  await fireEvent.press(toInc);
  expect(stepperValue(p.to)).toBe('30');
  await fireEvent.press(fromInc);
  await fireEvent.press(fromInc);
  expect([stepperValue(p.from), stepperValue(p.to)]).toEqual(['30', '30']);
  await fireEvent.press(toDec);
  expect([stepperValue(p.from), stepperValue(p.to)]).toEqual(['29', '29']);
  await fireEvent.changeText(screen.getByLabelText(p.from), '0');
  await fireEvent(screen.getByLabelText(p.from), 'endEditing');
  expect(stepperValue(p.from)).toBe('1');
  await fireEvent.press(fromDec);
  expect(stepperValue(p.from)).toBe('1');
  await fireEvent.press(screen.getByRole('button', { name: p.done }));
  expect(onDone).toHaveBeenCalledWith({ surah: 67, from: 1, to: 29 });
});
