import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DynamicFieldComponent } from '../../../common/components/dynamic-field/dynamic-field.component';
import { ConfigParameter, TableColumn } from '../../../common/models/interfaces';
import { PluginMetaInfo, PluginSectionConfig } from '../../../common/models/plugins-config';
import { AppConfigService } from '../../../common/services/app-config.service';
import { PluginsApiService } from '../../../common/services/plugins-api.service';
import { SharedService } from '../../../common/services/shared.service';
import {
  StringTypeValidators,
  validateParameterValue,
  ValidationError,
} from '../plugin-parameter-validation';

/** Extracted from PluginConfigComponent's parameter-edit flow (former
 *  rowClicked()/saveConfig()). Bundles the validation-errors sub-dialog,
 *  which is only ever reached from inside this same save flow. */
@Component({
  selector: 'app-plugin-parameter-dialog',
  templateUrl: './plugin-parameter-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    Dialog,
    DynamicFieldComponent,
    FaIconComponent,
    FormsModule,
    NgStyle,
    PrimeTemplate,
    Select,
    TableModule,
    TranslatePipe,
  ],
})
export class PluginParameterDialogComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly pluginsApi = inject(PluginsApiService);
  private readonly translate = inject(TranslateService);
  private readonly shared = inject(SharedService);
  private readonly appConfig = inject(AppConfigService);

  readonly faExclamationTriangle = faExclamationTriangle;

  readonly configname = input<string>('');
  readonly pluginname = input<string>('');
  readonly meta = input<PluginMetaInfo | undefined>(undefined);
  readonly currentConfig = input<PluginSectionConfig | undefined>(undefined);
  /** Other confnames configuring the same plugin, for the copy-from
   *  dropdown. Empty for single-instance plugins. */
  readonly siblingConfigs = input<{ confname: string; config: PluginSectionConfig }[]>([]);
  readonly isReadonly = input<boolean>(false);

  readonly visible = model(false);

  readonly saved = output<{ confname: string; enabled: string; instance: string }>();

  readonly classic = computed(() => {
    const meta = this.meta();
    let classic = true;
    if (meta != null && meta.plugin !== undefined) {
      if (meta.plugin.type !== undefined && meta.plugin.type !== 'classic') {
        classic = false;
      }
    }
    return classic;
  });

  readonly state = computed(() => {
    const meta = this.meta();
    let state = '';
    if (meta != null && meta.plugin !== undefined && meta.plugin.state !== undefined) {
      state = meta.plugin.state;
    }
    return state;
  });

  readonly description = computed(() => {
    const meta = this.meta();
    const desc =
      meta != null && meta.plugin !== undefined ? (meta.plugin.description ?? null) : null;
    return this.shared.getDescription(desc);
  });

  readonly parameter_cols: TableColumn[] = [
    { field: 'name', sfield: 'confname', header: 'PLUGIN.PARAMETER', width: '190px' },
    { field: 'type', sfield: 'conftype', header: 'PLUGIN.TYPE', width: '80px' },
    { field: 'value', sfield: 'paramvalue', header: 'PLUGIN.VALUE', width: '240px' },
    { field: 'desc', sfield: '', header: 'PLUGIN.DESCRIPTION', width: '' },
  ];

  /** Rebuilt from meta/currentConfig, same as the old rowClicked() did
   *  imperatively - reading visible() here (unused otherwise) forces a
   *  fresh rebuild every time the dialog (re)opens, even when reopening
   *  the same row without an intervening list reload, discarding any
   *  unsaved local edits exactly like the original's unconditional
   *  per-click rebuild did. */
  readonly parameters = linkedSignal<ConfigParameter[]>(() => {
    this.visible();
    return this.buildParameters(this.meta(), this.currentConfig());
  });

  readonly pluginEnabled = linkedSignal<boolean>(() => {
    this.visible();
    const conf = this.currentConfig();
    let enabled = true;
    if (conf?.plugin_enabled !== undefined) {
      if (typeof conf.plugin_enabled === 'boolean') {
        enabled = conf.plugin_enabled;
      } else if (
        typeof conf.plugin_enabled === 'string' &&
        conf.plugin_enabled.toLowerCase() === 'false'
      ) {
        enabled = false;
      }
    }
    return enabled;
  });

  readonly copyFromOptions = computed(() =>
    this.siblingConfigs().map((s) => ({ label: s.confname, value: s.confname })),
  );

  /** Same visible()-tracking as parameters/pluginEnabled above - the dialog
   *  component instance persists across opens (it's always in the DOM,
   *  just toggled), so a plain signal.set(null) after applying a copy isn't
   *  enough on its own: resetting it *synchronously inside the p-select's
   *  own (ngModelChange) handler* left the widget's displayed label stuck
   *  on the previous pick (PrimeNG's internal selected-option display
   *  state didn't reliably pick up a same-tick reset), which in turn meant
   *  re-selecting the same option didn't fire a change on the next attempt
   *  - "second time" copy silently did nothing. Not resetting after apply
   *  and instead resetting fresh on every open, exactly like the other two
   *  linkedSignals here, avoids the self-triggered-reset entirely. */
  readonly copyFromSelection = linkedSignal<string | null>(() => {
    this.visible();
    return null;
  });

  onCopyFromChange(sourceConfname: string | null): void {
    const source = this.siblingConfigs().find((s) => s.confname === sourceConfname);
    if (!source) {
      return;
    }
    // 'instance' identifies this specific section - some plugins declare it
    // as a regular metadata parameter (editable like any other setting), in
    // which case buildParameters() would happily copy it too. Copying it
    // from a sibling would recreate exactly the instance-name collision the
    // add flow's auto-assignment (see shng's PluginController.add()) exists
    // to prevent, so it's excluded from the copy - keep whatever this
    // dialog's own instance currently is.
    const ownInstance = this.parameters().find((p) => p['name'] === 'instance')?.['value'];
    const copied = this.buildParameters(this.meta(), source.config);
    const copiedInstance = copied.find((p) => p['name'] === 'instance');
    if (copiedInstance) {
      copiedInstance['value'] = ownInstance;
    }
    this.parameters.set(copied);
  }

  readonly saveError = signal<string | null>(null);

  validation_dialog_display = false;
  validation_dialog_parameter!: string;
  validation_dialog_text: string[] = [];

  private buildParameters(
    meta: PluginMetaInfo | undefined,
    conf: PluginSectionConfig | undefined,
  ): ConfigParameter[] {
    const parameters: ConfigParameter[] = [];
    if (conf == null) {
      return parameters;
    }

    const lang = this.appConfig.defaultLanguage;
    const metaParams = meta?.parameters ?? {};
    if (meta != null && (meta.parameters as unknown) !== 'NONE') {
      for (const param in metaParams) {
        if (metaParams.hasOwnProperty(param)) {
          const pm = metaParams[param];
          const vl: { label: string; value: unknown }[] = [];
          if (pm.valid_list !== undefined) {
            for (let i = 0; i < pm.valid_list.length; i++) {
              vl.push({ label: String(pm.valid_list[i]), value: pm.valid_list[i] });
            }
          }

          if (pm.type === 'bool') {
            vl.push({ label: 'true', value: true });
            vl.push({ label: 'false', value: false });
          }

          let paramdesc = '';
          if (pm.description !== undefined) {
            paramdesc = pm.description[lang];
            if (paramdesc === '' || paramdesc === undefined) {
              paramdesc = pm.description[this.shared.getFallbackLanguage()];
              if (paramdesc === '' || paramdesc === undefined) {
                paramdesc = pm.description[this.shared.getFallbackLanguage(1)];
              }
            }
          }
          paramdesc = this.shared.mdLiteToHtml(paramdesc);

          const paramdata: ConfigParameter = {
            name: param,
            type: pm.type,
            gui_type: pm.gui_type,
            valid_list: vl,
            valid_min: pm.valid_min,
            valid_max: pm.valid_max,
            default: pm.default,
            mandatory: pm.mandatory,
            value: conf[param],
            desc: paramdesc,
            initial_unset: false as boolean,
          };

          if (paramdata['type'] === 'list') {
            paramdata['default'] = this.shared.listToString(
              pm.default as string | string[] | undefined,
            );
          }
          if (pm.hide && ['str', 'int'].indexOf(pm.type ?? '') !== -1) {
            paramdata['type'] = 'hide' + '-' + pm.type;
          }

          const initial_unset = conf[param] === undefined || conf[param] === null;
          paramdata['initial_unset'] = initial_unset;

          if (paramdata['type'] === 'bool') {
            if (conf[param] === undefined || conf[param] === null) {
              if (initial_unset && paramdata['default'] != null) {
                paramdata['value'] =
                  typeof paramdata['default'] === 'boolean'
                    ? paramdata['default']
                    : String(paramdata['default']).toLowerCase() === 'true';
              } else {
                paramdata['value'] = null;
              }
            } else if (typeof conf[param] === 'boolean') {
              paramdata['value'] = conf[param];
            } else {
              paramdata['value'] = (conf[param] as string).toLowerCase() === 'true';
            }
          } else if (paramdata['type'] === 'list') {
            paramdata['value'] =
              initial_unset && paramdata['default'] != null
                ? paramdata['default']
                : this.shared.listToString(conf[param] as string);
          } else if (paramdata['type'] === 'int') {
            paramdata['value'] =
              initial_unset && paramdata['default'] != null
                ? typeof paramdata['default'] === 'number'
                  ? paramdata['default']
                  : parseInt(String(paramdata['default']), 10)
                : parseInt(conf[param] as string, 10);
          } else {
            paramdata['value'] =
              initial_unset && paramdata['default'] != null
                ? String(paramdata['default'])
                : (conf[param] as string);
          }

          parameters.push(paramdata);
        }
      }
    }
    return parameters;
  }

  private readonly parameterValidators: StringTypeValidators = {
    isKnxGroupaddress: (v) => this.shared.is_knx_groupaddress(v),
    isMac: (v) => this.shared.is_mac(v),
    isIpv4: (v) => this.shared.is_ipv4(v),
    isIpv6: (v) => this.shared.is_ipv6(v),
    isHostname: (v) => this.shared.is_hostname(v),
  };

  private validationErrorToText(error: ValidationError): string {
    switch (error.code) {
      case 'invalid_knx_address':
        return "'" + error.value + "' " + this.translate.instant('PLUGIN.INVALID_KNX_ADDRESS');
      case 'invalid_mac_address':
        return "'" + error.value + "' " + this.translate.instant('PLUGIN.INVALID_MAC_ADDRESS');
      case 'invalid_ip_address':
        return (
          "'" +
          error.value +
          "' " +
          this.translate.instant('PLUGIN.INVALID_IP_ADDRESS') +
          ' (' +
          error.version +
          ')'
        );
      case 'invalid_hostname':
        return "'" + error.value + "' " + this.translate.instant('PLUGIN.INVALID_HOSTNAME');
      case 'below_min':
        return (
          this.translate.instant('PLUGIN.DEFINED_MIN') +
          " '" +
          error.min +
          "'" +
          ', ' +
          this.translate.instant('PLUGIN.ACTUAL_VALUE') +
          " '" +
          error.value +
          "'"
        );
      case 'above_max':
        return (
          this.translate.instant('PLUGIN.DEFINED_MAX') +
          " '" +
          error.max +
          "'" +
          ', ' +
          this.translate.instant('PLUGIN.ACTUAL_VALUE') +
          " '" +
          error.value +
          "'"
        );
      case 'mandatory_value':
        return this.translate.instant('PLUGIN.MANDATORY_VALUE');
    }
  }

  saveConfig(): void {
    const conf = this.currentConfig();
    if (conf == null) {
      return;
    }

    let errorsFound = false;
    this.validation_dialog_text = [];
    // Captured before visible.set(false) below - that write is one of this
    // linkedSignal's own tracked dependencies (see its doc comment), so
    // reading pluginEnabled() *after* it would silently discard the user's
    // toggle and re-derive it fresh from currentConfig() instead.
    const parameters = this.parameters();
    const pluginEnabled = this.pluginEnabled();
    for (let i = 0; i < parameters.length; i++) {
      const isUnchangedDefault =
        parameters[i]['initial_unset'] &&
        parameters[i]['default'] != null &&
        String(parameters[i]['value']) === String(parameters[i]['default']);

      if (parameters[i]['value'] === '' || parameters[i]['value'] === null || isUnchangedDefault) {
        conf[parameters[i]['name'] as string] = undefined;
      } else {
        conf[parameters[i]['name'] as string] = parameters[i]['value'];
      }

      if (parameters[i]['value'] === undefined) {
        parameters[i]['value'] = null;
      }

      const errors = validateParameterValue(parameters[i], this.parameterValidators);

      if (errors.length > 0) {
        errorsFound = true;
        // Only the last error is shown, matching the previous inline
        // logic where each check overwrote (not appended to) error_text.
        const errorText = this.validationErrorToText(errors[errors.length - 1]);
        this.validation_dialog_text.push(
          this.translate.instant('PLUGIN.PARAMETER') +
            " '" +
            parameters[i]['name'] +
            "': " +
            errorText,
        );
        this.validation_dialog_parameter = parameters[i]['name'] as string;
        this.validation_dialog_display = true;
      }
    }

    if (errorsFound) {
      return;
    }

    this.visible.set(false);
    this.saveError.set(null);

    const saveParams = conf._meta?.parameters ?? {};
    for (const param of Object.keys(saveParams)) {
      if (saveParams[param].type === 'list' && conf[param] !== undefined) {
        conf[param] = this.shared.stringToList(conf[param] as string);
      }
    }

    conf['plugin_enabled'] = pluginEnabled;
    const enabled = pluginEnabled ? 'true' : 'false';
    const instance = (conf['instance'] as string) ?? '';

    // Emitted synchronously, before the network call resolves - matches the
    // original's optimistic, un-rolled-back mutation of rowclicked_foredit,
    // which happened in the same synchronous block as dialog_display.set(false)
    // rather than waiting on the save response.
    this.saved.emit({ confname: this.configname(), enabled, instance });

    const config = JSON.parse(JSON.stringify(conf));
    delete config['_meta'];
    delete config['_description'];
    for (const key in config) {
      if (config.hasOwnProperty(key) && config[key] === null) {
        delete config[key];
      }
    }

    const confname = this.configname();

    this.pluginsApi
      .setPluginConfig(confname, { config })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response !== true) {
          this.saveError.set(this.translate.instant('PLUGIN.SAVE_FAILED'));
          this.visible.set(true);
        }
      });
  }

  abort(): void {
    this.visible.set(false);
    this.saveError.set(null);
  }
}
