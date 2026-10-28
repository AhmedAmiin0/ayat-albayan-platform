import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import type { PickTarget } from './picker-state';
import { SurahPicker } from './SurahPicker';

const p = t.reports.v2.picker;
const step = (end: string, button: string) =>
  fireEvent.click(within(screen.getByRole('group', { name: end })).getByRole('button', { name: button }));

function openPicker(target: PickTarget = { kind: 'new', index: -1, start: { surah: 67, from: 16, to: 30 }, after: 15 }) {
  const onDone = vi.fn();
  render(<SurahPicker title={t.reports.v2.segment.new} target={target} recent={[67, 68]} onDone={onDone} onClose={vi.fn()} />);
  return onDone;
}

describe('«اختر السورة والآيات» picker', () => {
  it('opens after the last saved ayah and says so', () => {
    openPicker();
    expect(screen.getByRole('dialog', { name: t.reports.v2.segment.new })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('15 آية · الصفحة 563–564 · الجزء 29. يبدأ تلقائيًا بعد آخر حفظ (الآية 15).');
    expect(screen.getByRole('button', { name: /سورة الملك/, pressed: true })).toBeTruthy();
  });

  it('search filters by name or number; no match says so', () => {
    openPicker();
    const search = screen.getByRole('searchbox', { name: p.search });
    fireEvent.change(search, { target: { value: 'القلم' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /سورة القلم/ })).toBeTruthy();
    fireEvent.change(search, { target: { value: '11' } });
    expect(screen.getByRole('button', { name: /سورة هود/ })).toBeTruthy();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText(p.noMatch)).toBeTruthy();
  });

  it('steppers stay inside the surah and keep from ≤ to; «تمّ» returns the range', () => {
    const onDone = openPicker();
    step(p.to, p.inc);
    expect(screen.getByRole('spinbutton', { name: p.to })).toHaveProperty('value', '30');
    step(p.from, p.dec);
    step(p.to, p.dec);
    fireEvent.change(screen.getByRole('spinbutton', { name: p.from }), { target: { value: '40' } });
    expect(screen.getByRole('spinbutton', { name: p.from })).toHaveProperty('value', '30');
    fireEvent.change(screen.getByRole('spinbutton', { name: p.from }), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: p.done }));
    expect(onDone).toHaveBeenCalledWith({ surah: 67, from: 20, to: 30 });
  });

  it('another surah (recent chip) starts at ayah 1 and drops the history line', () => {
    openPicker();
    fireEvent.click(screen.getByRole('button', { name: 'القلم' }));
    expect(screen.getByRole('status').textContent).toBe('10 آيات · الصفحة 564 · الجزء 29.');
  });

  it('nothing picked yet: «تمّ» waits for a surah', () => {
    openPicker({ kind: 'new', index: -1, start: null, after: null });
    expect(screen.getByRole('button', { name: p.done })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: /سورة الفاتحة/ }));
    expect(screen.getByRole('button', { name: p.done })).toHaveProperty('disabled', false);
  });
});
