import { render } from '@testing-library/react-native';
import TabsLayout from '../../../../app/(tabs)/_layout';

// One realtime mount per signed-in staff tree (admin, sales), gated on inbox.read like the admin
// inbox; the teacher's, the assistant's and the family's trees never join the staff topic.

interface Dirent {
  name: string;
  isDirectory(): boolean;
}
interface Fs {
  readdirSync(path: string, opts: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
const fs = jest.requireActual<Fs>('fs');
declare const __dirname: string;
const ROOT = `${__dirname}/../../../..`;

function codeFiles(dir: string): string[] {
  return fs.readdirSync(`${ROOT}/${dir}`, { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return codeFiles(rel);
    return /\.tsx?$/.test(e.name) && !e.name.includes('.test.') ? [rel] : [];
  });
}

const mockRealtime = jest.fn();
let mockInbox = true;
jest.mock('@/inbox', () => ({ useInboxRealtime: (on: boolean) => mockRealtime(on) }));
jest.mock('@/auth', () => ({
  usePermissions: () => ({}),
  canOpen: (_can: unknown, area: string) => area === 'inbox' && mockInbox,
  tabOpen: () => true,
}));
jest.mock('@/core/nav/use-inbox-badge', () => ({ useInboxBadge: () => undefined }));
jest.mock('@/core/push/usePushRegistration', () => ({ usePushRegistration: () => undefined }));
jest.mock('@/core/ui/layout/AppNativeTabs', () => ({ AppNativeTabs: () => null }));

beforeEach(() => mockRealtime.mockClear());

test('only the admin tab layout and the sales tabs mount it, once each', () => {
  const calls = [...codeFiles('app'), ...codeFiles('src')].flatMap((f) => {
    const n = fs.readFileSync(`${ROOT}/${f}`, 'utf8').match(/\buseInboxRealtime\(/g)?.length ?? 0;
    return f.endsWith('use-inbox-realtime.ts') || n === 0 ? [] : [`${f} ×${n}`];
  });
  expect(calls).toEqual(['app/(tabs)/_layout.tsx ×1', 'src/sales-app/screens/SalesTabs.tsx ×1']);
});

test('the admin tree mounts it exactly once, enabled only with inbox.read', async () => {
  await render(<TabsLayout />);
  expect(mockRealtime.mock.calls).toEqual([[true]]);
  mockRealtime.mockClear();
  mockInbox = false;
  await render(<TabsLayout />);
  expect(mockRealtime.mock.calls).toEqual([[false]]);
});
