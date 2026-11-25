import {
  AttributeMeta,
  formatValidationError,
  StringTypeValidators,
  validateAttributeRows,
  validateValue,
} from './input-validation.utils';

const acceptAll: StringTypeValidators = {
  isKnxGroupaddress: () => true,
  isMac: () => true,
  isIpv4: () => true,
  isIpv6: () => true,
  isHostname: () => true,
};

const rejectAll: StringTypeValidators = {
  isKnxGroupaddress: () => false,
  isMac: () => false,
  isIpv4: () => false,
  isIpv6: () => false,
  isHostname: () => false,
};

describe('validateValue', () => {
  it('passes a well-formed value with no restrictions', () => {
    expect(validateValue({ type: 'str', value: 'anything' }, acceptAll)).toEqual([]);
  });

  it('skips format checks for an empty or null value', () => {
    expect(validateValue({ type: 'mac', value: '' }, rejectAll)).toEqual([]);
    expect(validateValue({ type: 'mac', value: null }, rejectAll)).toEqual([]);
  });

  it.each([
    ['knx_ga', 'invalid_knx_address'],
    ['mac', 'invalid_mac_address'],
    ['ipv4', 'invalid_ip_address'],
    ['ipv6', 'invalid_ip_address'],
  ] as const)('flags a bad %s value', (type, code) => {
    const errors = validateValue({ type, value: 'garbage' }, rejectAll);
    expect(errors).toEqual([expect.objectContaining({ code })]);
  });

  it('flags a plain ip value only when neither ipv4, ipv6, nor hostname match', () => {
    expect(validateValue({ type: 'ip', value: 'garbage' }, rejectAll)).toEqual([
      { code: 'invalid_hostname', value: 'garbage' },
    ]);
    expect(validateValue({ type: 'ip', value: '10.0.0.1' }, acceptAll)).toEqual([]);
  });

  it('flags a value below valid_min', () => {
    expect(validateValue({ type: 'int', value: 5, valid_min: 10 }, acceptAll)).toEqual([
      { code: 'below_min', value: 5, min: 10 },
    ]);
  });

  it('flags a value above valid_max', () => {
    expect(validateValue({ type: 'int', value: 100, valid_max: 10 }, acceptAll)).toEqual([
      { code: 'above_max', value: 100, max: 10 },
    ]);
  });

  it('flags a missing mandatory value', () => {
    expect(validateValue({ type: 'str', value: '', mandatory: true }, acceptAll)).toEqual([
      { code: 'mandatory_value' },
    ]);
    expect(validateValue({ type: 'str', value: null, mandatory: true }, acceptAll)).toEqual([
      { code: 'mandatory_value' },
    ]);
  });

  it('does not flag a missing non-mandatory value', () => {
    expect(validateValue({ type: 'str', value: '', mandatory: false }, acceptAll)).toEqual([]);
  });
});

describe('formatValidationError', () => {
  const t = (key: string) => key;

  it('formats every error code into non-empty text', () => {
    const errors: Parameters<typeof formatValidationError>[0][] = [
      { code: 'invalid_knx_address', value: '1/2/3' },
      { code: 'invalid_mac_address', value: 'zz' },
      { code: 'invalid_ip_address', value: '1.2.3.4', version: 'v4' },
      { code: 'invalid_hostname', value: 'bad host' },
      { code: 'below_min', value: 1, min: 10 },
      { code: 'above_max', value: 100, max: 10 },
      { code: 'mandatory_value' },
    ];
    for (const error of errors) {
      expect(formatValidationError(error, t)).toEqual(expect.any(String));
      expect(formatValidationError(error, t).length).toBeGreaterThan(0);
    }
  });
});

describe('validateAttributeRows', () => {
  const catalog: Record<string, AttributeMeta> = {
    database_maxage: { type: 'num', valid_min: 0 },
    mac_attr: { type: 'mac' },
  };
  const lookup = (key: string) => catalog[key] ?? {};

  it('returns null when every row passes', () => {
    const rows = [{ key: 'database_maxage', value: 5 }];
    expect(validateAttributeRows(rows, lookup, acceptAll)).toBeNull();
  });

  it('skips rows with an empty (still-being-typed) key', () => {
    const rows = [{ key: '  ', value: 'garbage' }];
    expect(validateAttributeRows(rows, lookup, rejectAll)).toBeNull();
  });

  it('returns the key and last error of the first invalid row', () => {
    const rows = [
      { key: 'database_maxage', value: -5 },
      { key: 'mac_attr', value: 'zz' },
    ];
    expect(validateAttributeRows(rows, lookup, rejectAll)).toEqual({
      key: 'database_maxage',
      error: { code: 'below_min', value: -5, min: 0 },
    });
  });
});
