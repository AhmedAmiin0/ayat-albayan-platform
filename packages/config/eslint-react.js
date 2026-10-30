// React rules (owner 2026-10-30, docs/31a §3.2): no pre-React-19 idioms, effects only in named hooks.
// One no-restricted-syntax list per file: flat config replaces a rule's options per block, so the effect
// block repeats the other selectors instead of adding a second block that would drop them.

/** Hook files: the only place a raw useEffect / useLayoutEffect may live. */
const HOOK_FILES =['**/use-*.ts', '**/use-*.tsx', '**/hooks/**'];

const fromReact = (names, message) => [
  { selector: `ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name=/^(${names})$/]`, message },
  { selector: `MemberExpression[object.name='React'][property.name=/^(${names})$/]`, message },
];

// The React Compiler memoizes (web: reactCompilerPreset target 18, mobile: experiments.reactCompiler).
const COMPILER = fromReact('useMemo|useCallback|memo', 'React Compiler: it memoizes, drop useMemo / useCallback / memo.');

// Need the React 19 runtime: web stays on React 18 until its upgrade.
const REACT_19 = [
  ...fromReact('forwardRef', 'React 19: ref is a prop, take `ref` in the props instead of forwardRef.'),
  ...fromReact('useContext', 'React 19: read a context with use(Context), not useContext.'),
  {
    selector: "JSXOpeningElement > JSXMemberExpression[property.name='Provider']",
    message: 'React 19: render <Context value={…}>, not <Context.Provider>.',
  },
];

const effect = 'Effects: move the useEffect / useLayoutEffect into a named hook (use-*.ts(x) or hooks/).';
const EFFECTS = [
  { selector: 'CallExpression[callee.name=/^use(Layout)?Effect$/]', message: effect },
  { selector: 'CallExpression[callee.property.name=/^use(Layout)?Effect$/]', message: effect },
];

/**
 * Two blocks: `files` (every React file of the package) get the compiler rule, plus the React 19 rules when
 * `react19`; `effects` (outside HOOK_FILES) also refuse a raw effect.
 */
export function reactRestrictions({ files, effects, react19 }) {
  const base = react19 ? [...COMPILER, ...REACT_19] : COMPILER;
  return [
    { files, rules: { 'no-restricted-syntax': ['error', ...base] } },
    { files: effects, ignores: HOOK_FILES, rules: { 'no-restricted-syntax': ['error', ...base, ...EFFECTS] } },
  ];
}
