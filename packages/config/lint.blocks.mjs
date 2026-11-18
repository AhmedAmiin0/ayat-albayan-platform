// The config package itself: the base rules only. vite.d.ts only types vite.js for the apps'
// configs (no tsconfig here to lint it with).
export default { react: false, blocks: [{ ignores: ['*.d.ts'] }] };
