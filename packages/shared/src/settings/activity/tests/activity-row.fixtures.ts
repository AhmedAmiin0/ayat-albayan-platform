import type { ActivityView } from '..';

export const anActivityRow = (): ActivityView => ({
  id: '7f0c1a52-1d3e-4a7b-9c4f-2b8e6d0a9f31',
  at: '2026-11-27T10:00:00.123+00:00',
  actor_id: null,
  actor_name: null,
  actor_role: 'public',
  action: 'students.create',
  method: 'POST',
  route: '/students',
  entity: 'students',
  entity_id: 'AB-0001',
  status: 201,
  duration_ms: 42,
  meta: { fields: ['name'] },
});
