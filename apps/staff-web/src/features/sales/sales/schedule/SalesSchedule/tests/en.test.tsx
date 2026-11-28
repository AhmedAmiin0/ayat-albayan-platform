import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pupil, scheduleLesson, teacher } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesSchedule } from '@/features/sales/sales/schedule/SalesSchedule/SalesSchedule';
import { SalesTeachers } from '@/features/sales/sales/teachers/SalesTeachers';
import { mockCall } from '@ab/testing/mock-call';

vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({
  ...(await orig<object>()),
  locale: 'en',
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('sales teachers and schedule, English', () => {
  it('the teacher drawer and the read-only day read in English', async () => {
    mockApi.onRead(async ({ path }) => {
      if (path === '/sales/teachers')
        return [
          teacher({
            name: 'أبرار',
            name_en: 'Abrar',
            students: [pupil({ name: 'Suhaila', status: 'trial' })],
          }),
        ];
      return {
        date: '2030-11-20',
        lessons: [
          scheduleLesson({
            trial: true,
            students: [{ id: 's1', code: 'AB-0183', name: 'Suhaila' }],
          }),
        ],
      };
    });
    renderWithQuery(
      <>
        <SalesTeachers />
        <SalesSchedule search={{ date: '2030-11-20' }} onSearch={() => undefined} />
      </>,
    );
    expect(
      await screen.findByText('View only: editing, cancelling and booking are done by the admin.'),
    ).toBeTruthy();
    expect(await screen.findByText('Trial')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Abrar/ }));
    const drawer = screen.getByRole('dialog', { name: "Abrar's students" });
    fireEvent.click(
      within(drawer).getByRole('button', { name: new RegExp(`^${en.studentLists.trial}`) }),
    );
    expect(within(drawer).getByText(en.enums.studentStatus.trial)).toBeTruthy();
    expect(
      within(drawer).getByRole('link', { name: "Show the teacher's schedule today" }),
    ).toBeTruthy();
  });
});
