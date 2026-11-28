import { studentProfileFixture } from '@ab/shared/testing';
import { pathKey } from '@ab/mobile-kit';
import { createTestQueryClient } from '@/test/query';
import { studentProfileQuery } from '@/students/profile-query';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

beforeEach(() => mockApiFetch.mockReset());

test('reads GET /students/:id through its route', async () => {
  const profile = studentProfileFixture({ id: 's1', name: 'سارة' });
  mockApiFetch.mockResolvedValue(profile);
  const read = await createTestQueryClient().query(studentProfileQuery('s1'));
  expect(read).toEqual(profile);
  expect(mockApiFetch).toHaveBeenCalledWith('/students/s1');
});

test('caches under the path key the student writes already refresh', () => {
  expect(studentProfileQuery('s1').queryKey).toEqual(pathKey('/students/s1'));
});

test('a profile that breaks the route answer is refused', async () => {
  mockApiFetch.mockResolvedValue({ id: 's1', name: 'سارة' });
  const read = createTestQueryClient().query(studentProfileQuery('s1'));
  await expect(read).rejects.toThrow();
});
