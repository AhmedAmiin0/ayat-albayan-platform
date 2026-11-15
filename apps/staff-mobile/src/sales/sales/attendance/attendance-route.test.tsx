import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

// The student file (`[id].tsx`) and its «سجل الحضور» (`[id]/attendance.tsx`) live side by side in both trees.
const stub = (label: string) => () => <Text>{label}</Text>;
const tree = {
  'students/[id]': stub('student-file'),
  'students/[id]/attendance': stub('attendance-log'),
  'sales/students/[id]': stub('sales-details'),
  'sales/students/[id]/attendance': stub('sales-attendance-log'),
};

test.each([
  ['/students/s1', 'student-file'],
  ['/students/s1/attendance', 'attendance-log'],
  ['/sales/students/s1', 'sales-details'],
  ['/sales/students/s1/attendance', 'sales-attendance-log'],
])('%s opens %s', async (initialUrl, label) => {
  await renderRouter(tree, { initialUrl });
  expect(await screen.findByText(label)).toBeTruthy();
});
