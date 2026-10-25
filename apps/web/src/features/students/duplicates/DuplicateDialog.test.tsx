import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { STUDENTS_KEY } from '../api';
import { EMPTY_STUDENT } from '../create/create-student';
import { DuplicateDialog } from './DuplicateDialog';
import type { StudentProfile, StudentRef } from '../types';

const SUHAILA: StudentRef = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active' };
const TYPED = { ...EMPTY_STUDENT, name: 'سهيله', guardianName: 'ام جود', guardianPhone: '00966501234567' };
const PROFILE = {
  ...SUHAILA,
  program: 'quran',
  guardian: { id: 'g1', name: 'أم جود', phone_e164: '+966501234567' },
  teacher: { id: 't1', display_name_ar: 'أ. هبة', meeting_link: null },
  siblings: [{ id: 's9', code: 'AB-0168', name: 'إيمان', status: 'trial' }],
} as unknown as StudentProfile;

function renderDialog(candidates = [SUHAILA]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData([...STUDENTS_KEY, 's1'], PROFILE);
  const props = { onClose: vi.fn(), onMerge: vi.fn(), onCreateAnyway: vi.fn() };
  render(
    <QueryClientProvider client={client}>
      <DuplicateDialog typed={TYPED} candidates={candidates} error={null} {...props} />
    </QueryClientProvider>,
  );
  return props;
}

const row = (label: string) => {
  const header = screen.getByRole('rowheader', { name: label });
  const r = header.closest('[role=row]');
  if (!(r instanceof HTMLElement)) throw new Error(`no row ${label}`);
  return within(r);
};

describe('DuplicateDialog compare (R-STU-03, docs/07 §6)', () => {
  it('is titled by the warning, calm (saffron hollow glyph), with the existing code', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: t.students.duplicateTitle });
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
    expect(dialog.querySelector('[data-glyph="hollow"]')).toBeTruthy();
    expect(screen.getByRole('table', { name: t.students.duplicateCandidates })).toBeTruthy();
    expect(screen.getByText('AB-0183')).toBeTruthy();
  });

  it('name row: only the differing letter is marked, result ≈ «اسم قريب»', () => {
    renderDialog();
    const name = row(t.students.name);
    expect([...document.querySelectorAll('[data-diff]')].map((n) => n.textContent)).toEqual(['ه', 'ة']);
    expect(name.getByText(t.students.nearName)).toBeTruthy();
  });

  it('phone row: typed as-is, its E.164 after normalising, «نفس الرقم»', () => {
    renderDialog();
    const phone = row(t.students.guardianPhone);
    expect(phone.getByText('00966501234567')).toBeTruthy();
    expect(phone.getAllByText('+966 50 123 4567')).toHaveLength(2); // grouped for reading back
    expect(phone.getByText(t.students.samePhone)).toBeTruthy();
  });

  it('guardian and program come from the existing profile', () => {
    renderDialog();
    expect(row(t.students.guardian).getByText(t.students.nearName)).toBeTruthy();
    const program = row(t.students.program);
    expect(program.getByText(t.students.sameValue)).toBeTruthy();
    expect(program.getByText(t.students.withTeacher.replace('{teacher}', 'أ. هبة'))).toBeTruthy();
  });

  it('siblings strip lists the other students only; actions call back', () => {
    const props = renderDialog();
    expect(screen.getByText('AB-0168')).toBeTruthy();
    expect(screen.getAllByText('AB-0183')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: t.students.merge }));
    expect(props.onMerge).toHaveBeenCalledWith(SUHAILA);
    fireEvent.click(screen.getByRole('button', { name: t.students.createAnyway }));
    expect(props.onCreateAnyway).toHaveBeenCalled();
  });

  it('several candidates: the admin picks which one to compare and merge into', () => {
    const other: StudentRef = { id: 's2', code: 'AB-0190', name: 'سهيله أحمد', status: 'trial' };
    const props = renderDialog([SUHAILA, other]);
    const group = screen.getByRole('group', { name: t.students.duplicateCandidates });
    fireEvent.click(within(group).getByRole('button', { name: /AB-0190/ }));
    fireEvent.click(screen.getByRole('button', { name: t.students.merge }));
    expect(props.onMerge).toHaveBeenCalledWith(other);
  });
});
