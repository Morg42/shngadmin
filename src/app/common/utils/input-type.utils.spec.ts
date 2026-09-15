import { resolveInputKind, resolveSelectOptions } from './input-type.utils';

describe('resolveInputKind', () => {
  it('prefers select whenever a valid_list is present, regardless of type', () => {
    expect(resolveInputKind('str', true, 'clearable-select')).toBe('select');
    expect(resolveInputKind('int', true, 'toggle')).toBe('select');
  });

  it('renders bool as a toggle or a clearable select per boolStyle', () => {
    expect(resolveInputKind('bool', false, 'toggle')).toBe('toggle');
    expect(resolveInputKind('bool', false, 'clearable-select')).toBe('select');
  });

  it('maps the numeric types to number', () => {
    for (const type of ['int', 'float', 'num', 'scene']) {
      expect(resolveInputKind(type, false, 'clearable-select')).toBe('number');
    }
  });

  it('maps list/dict/password to their own kinds', () => {
    expect(resolveInputKind('list', false, 'toggle')).toBe('list');
    expect(resolveInputKind('dict', false, 'toggle')).toBe('dict');
    expect(resolveInputKind('password', false, 'toggle')).toBe('password');
  });

  it('matches a subtyped list by its base, before the paren', () => {
    expect(resolveInputKind('list(num)', false, 'toggle')).toBe('list');
  });

  it('falls back to text for formats with no dedicated control', () => {
    for (const type of [
      'str',
      'ip',
      'ipv4',
      'ipv6',
      'mac',
      'knx_ga',
      'foo',
      'timestamp',
      undefined,
    ]) {
      expect(resolveInputKind(type, false, 'toggle')).toBe('text');
    }
  });
});

describe('resolveSelectOptions', () => {
  it('maps an explicit valid_list to label/value pairs', () => {
    expect(resolveSelectOptions('str', ['a', 'b'])).toEqual([
      { label: 'a', value: 'a' },
      { label: 'b', value: 'b' },
    ]);
  });

  it('synthesizes true/false for a bool with no valid_list', () => {
    expect(resolveSelectOptions('bool', undefined)).toEqual([
      { label: 'true', value: true },
      { label: 'false', value: false },
    ]);
  });

  it('an explicit valid_list on a bool wins over synthesis', () => {
    expect(resolveSelectOptions('bool', ['yes', 'no'])).toEqual([
      { label: 'yes', value: 'yes' },
      { label: 'no', value: 'no' },
    ]);
  });

  it('returns undefined for a non-bool type with no valid_list', () => {
    expect(resolveSelectOptions('str', undefined)).toBeUndefined();
    expect(resolveSelectOptions('str', [])).toBeUndefined();
  });
});
