// eslint-plugin-jsx-a11y's flatConfigs.recommended rules with the options it sets (web .tsx files),
// written out so the same list runs under ESLint and Oxlint's native jsx-a11y rules.
// role="admin" / "teacher" on our own components is a prop, not an ARIA role (aria-role).

const PLAIN = [
  'alt-text',
  'anchor-has-content',
  'anchor-is-valid',
  'aria-activedescendant-has-tabindex',
  'aria-props',
  'aria-proptypes',
  'aria-unsupported-elements',
  'autocomplete-valid',
  'click-events-have-key-events',
  'heading-has-content',
  'html-has-lang',
  'iframe-has-title',
  'img-redundant-alt',
  'label-has-associated-control',
  'media-has-caption',
  'mouse-events-have-key-events',
  'no-access-key',
  'no-autofocus',
  'no-distracting-elements',
  'no-redundant-roles',
  'role-has-required-aria-props',
  'role-supports-aria-props',
  'scope',
  'tabindex-no-positive',
];

const KEYS = ['onKeyUp', 'onKeyDown', 'onKeyPress'];
const LOAD = ['onError', 'onLoad'];
const MOUSE = ['onClick', 'onMouseDown', 'onMouseUp'];
const COMPOSITE = ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'];
const ITEMS = ['menuitem', 'menuitemradio', 'menuitemcheckbox', 'option', 'row', 'tab', 'treeitem'];
const TABBABLE = ['button', 'checkbox', 'link', 'searchbox', 'spinbutton', 'switch', 'textbox'];

const OPTIONS = {
  'aria-role': { ignoreNonDOM: true },
  'interactive-supports-focus': { tabbable: TABBABLE },
  'no-interactive-element-to-noninteractive-role': {
    tr: ['none', 'presentation'],
    canvas: ['img'],
  },
  'no-noninteractive-element-interactions': {
    handlers: [
      'onClick',
      ...LOAD,
      'onMouseDown',
      'onMouseUp',
      'onKeyPress',
      'onKeyDown',
      'onKeyUp',
    ],
    alert: KEYS,
    body: LOAD,
    dialog: KEYS,
    iframe: LOAD,
    img: LOAD,
  },
  'no-noninteractive-element-to-interactive-role': {
    ul: COMPOSITE,
    ol: COMPOSITE,
    li: ITEMS,
    table: ['grid'],
    td: ['gridcell'],
    fieldset: ['radiogroup', 'presentation'],
  },
  'no-noninteractive-tabindex': { tags: [], roles: ['tabpanel'], allowExpressionValues: true },
  'no-static-element-interactions': {
    allowExpressionValues: true,
    handlers: [...MOUSE, 'onKeyPress', 'onKeyDown', 'onKeyUp'],
  },
};

/** `jsx-a11y/<rule>` → its level and options, as ESLint resolves the recommended preset. */
export const a11yRules = {
  ...Object.fromEntries(PLAIN.map((rule) => [`jsx-a11y/${rule}`, 'error'])),
  ...Object.fromEntries(
    Object.entries(OPTIONS).map(([rule, options]) => [`jsx-a11y/${rule}`, ['error', options]]),
  ),
};
