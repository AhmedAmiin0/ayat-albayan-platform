import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { BroughtByField } from './students/BroughtByField';
import { BulkAssign } from './students/BulkAssign';
import { ASSISTANT, termsRowOf } from './fixtures';
import type { StudentPick } from './students/use-student-pick';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
const held = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: held.list, can: (p: string) => held.list.includes(p) }),
}));

const B = t.assistants.brought;
const client = () => new QueryClient();
let broughtBy: unknown;

beforeEach(() => {
  mockApi.reset('read');
  mockApi.reset('write');
  mockApi.onWrite(() => ({ changed: 1 }));
  held.list = ['assistantpay.read', 'assistantpay.write'];
  broughtBy = { assistant: null, brought_at: null };
  mockApi.onRead(async ({ path }) =>
    path.startsWith('/assistant-pay/brought-by') ? broughtBy : [termsRowOf(ASSISTANT)],
  );
});

describe('BroughtByField on the student profile (R-ASST-01)', () => {
  const mount = () =>
    render(
      <QueryClientProvider client={client()}>
        <BroughtByField studentId="s1" />
      </QueryClientProvider>,
    );

  it('an unset student reads «لم يُحدد»; picking an assistant saves one student', async () => {
    mount();
    expect(await screen.findByText(B.none)).toBeTruthy();
    const save = screen.getByRole<HTMLButtonElement>('button', { name: B.save });
    expect(save.disabled).toBe(true);
    fireEvent.change(await screen.findByLabelText(B.select), { target: { value: 'a1' } });
    fireEvent.click(save);
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/assistant-pay/brought-by',
        body: { studentIds: ['s1'], assistantId: 'a1' },
      }),
    );
  });

  it('a past «تاريخ الإحضار» is sent as the instant; clearing sends null', async () => {
    broughtBy = { assistant: { id: 'a1', name: 'الزهراء' }, brought_at: '2026-10-01T09:00:00Z' };
    mount();
    expect(await screen.findByText(/بتاريخ/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(B.broughtAt), { target: { value: '2026-09-20' } });
    fireEvent.click(screen.getByRole('button', { name: B.save }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/assistant-pay/brought-by',
        body: { studentIds: ['s1'], assistantId: 'a1', broughtAt: '2026-09-20T09:00:00.000Z' },
      }),
    );
    fireEvent.change(screen.getByLabelText(B.select), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: B.save }));
    await vi.waitFor(() =>
      expect(mockApi.writes().at(-1)).toEqual({
        method: 'POST',
        path: '/assistant-pay/brought-by',
        body: { studentIds: ['s1'], assistantId: null },
      }),
    );
  });

  it('read-only: shows who brought them, no controls; without assistantpay.read nothing', async () => {
    held.list = ['assistantpay.read'];
    broughtBy = { assistant: { id: 'a1', name: 'الزهراء' }, brought_at: '2026-10-01T09:00:00Z' };
    const { container } = mount();
    expect(await screen.findByText(/بتاريخ/)).toBeTruthy();
    expect(screen.queryByLabelText(B.select)).toBeNull();
    held.list = [];
    const none = render(
      <QueryClientProvider client={client()}>
        <BroughtByField studentId="s2" />
      </QueryClientProvider>,
    );
    expect(none.container.textContent).toBe('');
    expect(container).toBeTruthy();
  });
});

describe('BulkAssign in the students head', () => {
  const pick = (ids: string[], enabled = true): StudentPick => ({
    enabled,
    ids,
    column: undefined,
    clear: vi.fn(),
  });
  const mount = (p: StudentPick, onDone = vi.fn()) =>
    render(
      <QueryClientProvider client={client()}>
        <BulkAssign pick={p} onDone={onDone} />
      </QueryClientProvider>,
    );

  it('shows nothing until students are ticked, and nothing without permission', () => {
    expect(mount(pick([])).container.textContent).toBe('');
    expect(mount(pick(['s1'], false)).container.textContent).toBe('');
  });

  it('assigns every ticked student in one request, clears the ticks and reports the count', async () => {
    const p = pick(['s1', 's2']);
    const onDone = vi.fn();
    mockApi.onWrite(() => ({ changed: 2 }));
    mount(p, onDone);
    fireEvent.click(screen.getByRole('button', { name: B.bulk.replace('{count}', '2') }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(await within(dialog).findByLabelText(B.select), { target: { value: 'a1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: B.bulkApply }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/assistant-pay/brought-by',
        body: { studentIds: ['s1', 's2'], assistantId: 'a1' },
      }),
    );
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(B.bulkDone.replace('{count}', '2')));
    expect(p.clear).toHaveBeenCalled();
  });
});
