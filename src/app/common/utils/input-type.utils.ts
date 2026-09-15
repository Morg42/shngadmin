/** Resolves which form control a catalog entry's declared value type should
 *  render as. Shared by every dynamic, type-driven input in the app (plugin
 *  parameters, module settings, logic parameters, item attributes) so they
 *  agree on one answer instead of each maintaining its own switch.
 *
 *  Known base types, as shng defines them (lib/constants.py META_DATA_TYPES):
 *  bool, int, float, num, scene, str, password, list, dict, ip, ipv4, ipv6,
 *  mac, knx_ga, foo, timestamp. A subtyped list like 'list(num)' is matched
 *  by its base, before '('. */

export type InputKind = 'select' | 'toggle' | 'number' | 'password' | 'list' | 'dict' | 'text';

/** Whether a bool value should render as a toggle or a clearable dropdown -
 *  a per-consumer choice, not a per-value one. A dropdown with a clear (x)
 *  is the only way to represent "not set, follow the default" for a value
 *  that's always present in a fixed row (plugin parameters, module
 *  settings, logic parameters - none of these rows can be deleted). A
 *  toggle is fine wherever "not set" is instead represented by the row's
 *  own presence/absence (item attributes: deleting the row is reverting to
 *  default), so there's no in-widget unset state to lose. */
export type BoolStyle = 'toggle' | 'clearable-select';

const NUMERIC_TYPES = new Set(['int', 'float', 'num', 'scene']);

export function resolveInputKind(
  type: string | undefined,
  hasValidList: boolean,
  boolStyle: BoolStyle,
): InputKind {
  if (hasValidList) {
    return 'select';
  }

  const base = (type ?? '').split('(')[0];

  if (base === 'bool') {
    return boolStyle === 'toggle' ? 'toggle' : 'select';
  }
  if (base === 'list') {
    return 'list';
  }
  if (base === 'dict') {
    return 'dict';
  }
  if (base === 'password') {
    return 'password';
  }
  if (NUMERIC_TYPES.has(base)) {
    return 'number';
  }
  // str, ip, ipv4, ipv6, mac, knx_ga, foo, timestamp - no dedicated control,
  // plain text; format-specific values are still checked by validateValue().
  return 'text';
}

export interface SelectOption {
  label: string;
  value: unknown;
}

/** Options for the 'select' input kind. A catalog entry's own valid_list is
 *  used as-is; a bool without one (most bool parameters/attributes don't
 *  define an explicit valid_list) synthesizes the true/false pair so it
 *  still renders as a dropdown instead of an unusable empty one - this
 *  replaces three previously-independent, disagreeing copies of the same
 *  synthesis (system-config, logics-edit, and dynamic-field's absence of
 *  one at all). */
export function resolveSelectOptions(
  type: string | undefined,
  validList: unknown[] | undefined,
): SelectOption[] | undefined {
  if (validList && validList.length > 0) {
    return validList.map((v) => ({ label: String(v), value: v }));
  }
  if ((type ?? '').split('(')[0] === 'bool') {
    return [
      { label: 'true', value: true },
      { label: 'false', value: false },
    ];
  }
  return undefined;
}
