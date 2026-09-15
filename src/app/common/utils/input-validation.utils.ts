/** Pure submit-time validation for any catalog-typed value (plugin
 *  parameter, module setting, logic parameter, or item attribute) - all
 *  four share the same shng type/valid_min/valid_max/mandatory vocabulary.
 *  Returns error codes rather than translated strings so the call site
 *  controls i18n; kept decoupled from SharedService/TranslateService so it
 *  only ever reads the single value being validated. */

export interface ValidatableValue {
  type?: string;
  value: unknown;
  valid_min?: number | string | null;
  valid_max?: number | string | null;
  mandatory?: boolean;
}

export interface StringTypeValidators {
  isKnxGroupaddress: (value: string) => boolean;
  isMac: (value: unknown) => boolean;
  isIpv4: (value: string) => boolean;
  isIpv6: (value: string) => boolean;
  isHostname: (value: string) => boolean;
}

export type ValidationError =
  | { code: 'invalid_knx_address'; value: string }
  | { code: 'invalid_mac_address'; value: string }
  | { code: 'invalid_ip_address'; value: string; version: 'v4' | 'v6' }
  | { code: 'invalid_hostname'; value: string }
  | { code: 'below_min'; value: number; min: number }
  | { code: 'above_max'; value: number; max: number }
  | { code: 'mandatory_value' };

/** Checks are evaluated in a fixed order; a caller that only displays the
 *  *last* pushed error (as saveConfig() does) gets that error preferentially. */
export function validateValue(
  item: ValidatableValue,
  validators: StringTypeValidators,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const value = item.value;

  if (value !== null && value !== '') {
    const type = String(item.type).toLowerCase();
    const strValue = value as string;
    if (type === 'knx_ga' && !validators.isKnxGroupaddress(strValue)) {
      errors.push({ code: 'invalid_knx_address', value: strValue });
    }
    if (type === 'mac' && !validators.isMac(strValue)) {
      errors.push({ code: 'invalid_mac_address', value: strValue });
    }
    if (type === 'ipv4' && !validators.isIpv4(strValue)) {
      errors.push({ code: 'invalid_ip_address', value: strValue, version: 'v4' });
    }
    if (type === 'ipv6' && !validators.isIpv6(strValue)) {
      errors.push({ code: 'invalid_ip_address', value: strValue, version: 'v6' });
    }
    if (
      type === 'ip' &&
      !validators.isIpv4(strValue) &&
      !validators.isIpv6(strValue) &&
      !validators.isHostname(strValue)
    ) {
      errors.push({ code: 'invalid_hostname', value: strValue });
    }
  }

  if (value !== null && (value as number) < (item.valid_min as number)) {
    errors.push({ code: 'below_min', value: value as number, min: item.valid_min as number });
  }
  if (value !== null && (value as number) > (item.valid_max as number)) {
    errors.push({ code: 'above_max', value: value as number, max: item.valid_max as number });
  }
  if ((value === undefined || value === null || value === '') && item.mandatory) {
    errors.push({ code: 'mandatory_value' });
  }

  return errors;
}

/** Renders one ValidationError as user-facing text. `t` is normally
 *  TranslateService.instant bound to the caller - kept as a plain function
 *  parameter so this stays testable without Angular DI. */
export function formatValidationError(error: ValidationError, t: (key: string) => string): string {
  switch (error.code) {
    case 'invalid_knx_address':
      return `'${error.value}' ${t('PLUGIN.INVALID_KNX_ADDRESS')}`;
    case 'invalid_mac_address':
      return `'${error.value}' ${t('PLUGIN.INVALID_MAC_ADDRESS')}`;
    case 'invalid_ip_address':
      return `'${error.value}' ${t('PLUGIN.INVALID_IP_ADDRESS')} (${error.version})`;
    case 'invalid_hostname':
      return `'${error.value}' ${t('PLUGIN.INVALID_HOSTNAME')}`;
    case 'below_min':
      return `${t('PLUGIN.DEFINED_MIN')} '${error.min}', ${t('PLUGIN.ACTUAL_VALUE')} '${error.value}'`;
    case 'above_max':
      return `${t('PLUGIN.DEFINED_MAX')} '${error.max}', ${t('PLUGIN.ACTUAL_VALUE')} '${error.value}'`;
    case 'mandatory_value':
      return t('PLUGIN.MANDATORY_VALUE');
  }
}

export interface AttributeRow {
  key: string;
  value: unknown;
}

export type AttributeMeta = Omit<ValidatableValue, 'value'>;

/** Validates a list of {key, value} rows (the shape create/edit-item-dialog
 *  use for an item's free-text attributes) against per-key catalog metadata
 *  (type/min/max/mandatory) from `lookup` - the row already carries its own
 *  value, `lookup` only needs to supply the rest. Rows with an empty
 *  (still-being-typed) key are skipped. Returns the first invalid row's
 *  last error, or null if every row passes - same "only the last error per
 *  value" convention validateValue() callers already use, just extended
 *  across a whole row list. */
export function validateAttributeRows(
  rows: AttributeRow[],
  lookup: (key: string) => AttributeMeta,
  validators: StringTypeValidators,
): { key: string; error: ValidationError } | null {
  for (const row of rows) {
    const key = row.key.trim();
    if (key === '') continue;
    const errors = validateValue({ ...lookup(key), value: row.value }, validators);
    if (errors.length > 0) {
      return { key, error: errors[errors.length - 1] };
    }
  }
  return null;
}
