// A CLI: console is its output.
export default {
  react: false,
  blocks: [{ ignores: ['cache/**', 'out/**'] }, { rules: { 'no-console': 'off' } }],
};
