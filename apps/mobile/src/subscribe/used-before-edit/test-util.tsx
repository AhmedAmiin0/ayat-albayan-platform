import type { UsedBeforeState } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { UsedBeforeEdit } from './UsedBeforeEdit';
import type { EditablePackage } from './use-used-before-edit';

// Test-only fixtures of the used-before editor.
export const SUB: EditablePackage = {
  id: 'sub1', status: 'active', lessons_used_before: 1, starts_on: '2026-01-01',
};
export const PATH = '/subscriptions/sub1/lessons-used-before';

export const stateOf = (over: Partial<UsedBeforeState> = {}): UsedBeforeState => ({
  subscription_id: 'sub1', lessons_used_before: 1, max: 5, blocked: null, ...over,
});

export const show = (sub: EditablePackage = SUB, client = createTestQueryClient()) =>
  renderWithQuery(<UsedBeforeEdit sub={sub} stale={[['sales']]} />, client);

export const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
