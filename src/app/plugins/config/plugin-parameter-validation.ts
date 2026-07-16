/** Pure parameter-value validation for the plugin-config parameter dialog.
 *  Returns error codes rather than translated strings so the call site
 *  controls i18n; kept decoupled from SharedService/TranslateService so it
 *  only ever reads the single parameter being validated. */

export interface ValidatableParameter {
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

/** Checks are evaluated in the same order as the original inline code, and
 *  callers that only display the *last* pushed error (as saveConfig() does)
 *  reproduce its exact overwrite-not-append behavior. */
export function validateParameterValue(
  param: ValidatableParameter,
  validators: StringTypeValidators,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const value = param.value;

  if (value !== null && value !== '') {
    const ptype = String(param.type).toLowerCase();
    const pvalue = value as string;
    if (ptype === 'knx_ga' && !validators.isKnxGroupaddress(pvalue)) {
      errors.push({ code: 'invalid_knx_address', value: pvalue });
    }
    if (ptype === 'mac' && !validators.isMac(pvalue)) {
      errors.push({ code: 'invalid_mac_address', value: pvalue });
    }
    if (ptype === 'ipv4' && !validators.isIpv4(pvalue)) {
      errors.push({ code: 'invalid_ip_address', value: pvalue, version: 'v4' });
    }
    if (ptype === 'ipv6' && !validators.isIpv6(pvalue)) {
      errors.push({ code: 'invalid_ip_address', value: pvalue, version: 'v6' });
    }
    if (
      ptype === 'ip' &&
      !validators.isIpv4(pvalue) &&
      !validators.isIpv6(pvalue) &&
      !validators.isHostname(pvalue)
    ) {
      errors.push({ code: 'invalid_hostname', value: pvalue });
    }
  }

  if (value !== null && (value as number) < (param.valid_min as number)) {
    errors.push({ code: 'below_min', value: value as number, min: param.valid_min as number });
  }
  if (value !== null && (value as number) > (param.valid_max as number)) {
    errors.push({ code: 'above_max', value: value as number, max: param.valid_max as number });
  }
  if ((value === undefined || value === null || value === '') && param.mandatory) {
    errors.push({ code: 'mandatory_value' });
  }

  return errors;
}
