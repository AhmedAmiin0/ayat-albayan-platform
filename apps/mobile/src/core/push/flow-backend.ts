import { inboxBackend } from '@/inbox/shared/flow-backend';
import { listItem, profile } from '@/students/test-data';

// The inbox API plus what a tapped push can open: Today (empty), a student's profile (no package).
export function pushBackend() {
  const { backend } = inboxBackend();
  const tokens: string[] = [];
  backend
    .on('GET /lessons/day', () => [])
    .on('GET /settings', () => ({ renewal_alert_remaining: 2, follow_up_hours: [2, 24, 72] }))
    .on('GET /students/:id', ({ params }) => ({ ...profile, id: params['id'] ?? profile.id, name: listItem().name }))
    .on('GET /students/:id/balance', ({ params }) => ({
      student_id: params['id'],
      remaining: 0,
      current: null,
      packages: [],
    }))
    // The API answers the device key to send next time (migration 720).
    .on('PUT /me/push-tokens', ({ body }) => {
      tokens.push((body as { token: string }).token);
      return { deviceKey: 'k'.repeat(43) };
    })
    .on('DELETE /me/push-tokens/:token', ({ params }) => {
      tokens.splice(tokens.indexOf(params['token'] ?? ''), 1);
    });
  return { backend, tokens };
}
