import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { home, lesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderAt } from '@/test/render-at';
import { GuardianCard } from './GuardianCard';

const apiFetch = vi.hoisted(() => vi.fn());
const pickChild = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/shell', () => ({
  usePickChild: () => pickChild,
  useFamilyPick: () => ({ state: 'one', student: { id: 's2' } }),
}));

const teacherLine = t.portal.app.lesson.teacher.replace('{name}', 'أبرار');

beforeEach(() => {
  apiFetch.mockReset();
  pickChild.mockReset();
});

describe('«الأبناء» cards on «حسابي»', () => {
  it("each child's code and its next lesson's teacher (none without a lesson ahead)", async () => {
    apiFetch.mockImplementation(async (path: string) =>
      ({ lessons: path.includes('/s1/') ? [lesson()] : [] }));
    renderAt(<GuardianCard home={home()} />);
    const named = { name: new RegExp(teacherLine) };
    const first = await screen.findByRole('button', named, { timeout: 5000 });
    expect(first.textContent).toContain('AB-0201');
    const second = screen.getByRole('button', { name: /AB-0202/ });
    expect(second.textContent).not.toContain(teacherLine);
  });

  it('marks the child in view and makes a pressed one the student in view, then home', async () => {
    apiFetch.mockResolvedValue({ lessons: [] });
    const { router } = renderAt(<GuardianCard home={home()} />, '/account');
    const second = await screen.findByRole('button', { name: /AB-0202/ });
    expect(second.getAttribute('aria-current')).toBe('true');
    const first = screen.getByRole('button', { name: /AB-0201/ });
    expect(first.getAttribute('aria-current')).toBeNull();
    fireEvent.click(first);
    expect(pickChild).toHaveBeenCalledWith('s1');
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/portal'));
  });
});
