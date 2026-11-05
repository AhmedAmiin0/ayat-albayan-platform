// Assistants edit people (owner 2026-11-02, /people/*): never delete or merge (those stay
// students.write / guardians.write). Sales defaults; granted by hand in production (no migration).
export const PEOPLE_EDIT_ROWS = [
  { key: 'people.edit', area: 'students', grants: ['sales'] },
  { key: 'students.attach_guardian', area: 'students', grants: ['sales'] },
  { key: 'people.switch_role', area: 'students', grants: ['sales'] },
] as const;
