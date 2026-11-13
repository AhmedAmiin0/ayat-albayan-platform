import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { factsLine, useStudentFacts } from './student-facts';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const QURAN = t.enums.program.quran;
const fact = (id: string, over: object = {}) => ({
  id, code: `AB-${id}`, name: id, status: 'active', program: 'quran', level: 'جزء عمّ', age: 9,
  next_lesson_at: null, ...over,
});

describe('factsLine (docs/48)', () => {
  it('program · level · age, in that order', () => {
    expect(factsLine({ program: 'quran', level: 'جزء عمّ', age: 9 })).toBe(`${QURAN} · جزء عمّ · 9 سنوات`);
  });

  it('drops nulls, never «—»', () => {
    expect(factsLine({ program: 'quran', level: null, age: null })).toBe(QURAN);
    expect(factsLine({ program: 'quran', level: null, age: 11 })).toBe(`${QURAN} · 11 سنة`);
  });

  it('the age is plural-aware', () => {
    const age = (n: number) => factsLine({ program: 'quran', level: null, age: n }).split(' · ')[1];
    expect([age(1), age(2), age(9), age(11)]).toEqual(['سنة واحدة', 'سنتان', '9 سنوات', '11 سنة']);
  });
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useStudentFacts', () => {
  it('reads both ?kind lists into one Map by id', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path.endsWith('kind=trial') ? [fact('s-2', { age: null })] : [fact('s-1')]);
    const { result } = renderHook(() => useStudentFacts(), { wrapper });
    await waitFor(() => expect(result.current.size).toBe(2));
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=subscribed');
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=trial');
    expect(result.current.get('s-2')).toBe(`${QURAN} · جزء عمّ`);
  });

  it('a failing kind only drops its own lines', async () => {
    apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith('kind=trial')) throw new Error('boom');
      return [fact('s-1')];
    });
    const { result } = renderHook(() => useStudentFacts(), { wrapper });
    await waitFor(() => expect(result.current.get('s-1')).toContain(QURAN));
    expect(result.current.size).toBe(1);
  });
});
