import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppConfigService } from '../../common/services/app-config.service';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ConfigApiService } from '../../common/services/config-api.service';
import { LogService } from '../../common/services/log.service';
import { ServerApiService } from '../../common/services/server-api.service';

import { ConfigParameter, TableColumn } from '../../common/models/interfaces';
import { SharedService } from '../../common/services/shared.service';

import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { sha512 } from 'js-sha512';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Ripple } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { DynamicFieldComponent } from '../../common/components/dynamic-field/dynamic-field.component';

interface ParameterMeta {
  type: string;
  gui_type?: string;
  valid_list?: unknown[];
  valid_min?: unknown;
  valid_max?: unknown;
  default?: unknown;
  mandatory?: boolean;
  description?: Record<string, string>;
}

interface ConfigSection {
  meta: { parameters: Record<string, ParameterMeta> };
  data: Record<string, unknown>;
}

interface SystemConfig {
  common: ConfigSection;
  http: ConfigSection;
  websocket: ConfigSection;
  admin: ConfigSection;
  mqtt: ConfigSection;
}

@Component({
  selector: 'app-system-config',
  templateUrl: './system-config.component.html',
  styleUrls: ['./system-config.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab,
    TabPanels,
    TabPanel,
    TableModule,
    PrimeTemplate,
    NgStyle,
    DynamicFieldComponent,
    ButtonDirective,
    Dialog,
    Message,
    FormsModule,
    InputText,
    TranslatePipe,
  ],
})
export class SystemConfigComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private dataService = inject(ConfigApiService);
  private dataServiceServer = inject(ServerApiService);
  private shared = inject(SharedService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  config!: SystemConfig;
  lang!: string;

  common_parameters!: ConfigParameter[];
  common_parameter_cols!: TableColumn[];
  common_parameters_beforeEdit!: ConfigParameter[];

  http_parameters!: ConfigParameter[];
  http_parameter_cols!: TableColumn[];
  http_parameters_beforeEdit!: ConfigParameter[];

  websocket_parameters!: ConfigParameter[];
  websocket_parameter_cols!: TableColumn[];
  websocket_parameters_beforeEdit!: ConfigParameter[];

  admin_parameters!: ConfigParameter[];
  admin_parameter_cols!: TableColumn[];
  admin_parameters_beforeEdit!: ConfigParameter[];

  mqtt_parameters!: ConfigParameter[];
  mqtt_parameter_cols!: TableColumn[];
  mqtt_parameters_beforeEdit!: ConfigParameter[];

  data_changed = false;
  restart_core_button = false;

  dialog_readonly = false;

  pwd_change_dialog_display = false;
  pwd_rowData: ConfigParameter | null = null;
  pwd_col: string | null = null;

  pwd_old: string | null = null;
  pwd_new1: string | null = null;
  pwd_new2: string | null = null;
  pwd_hash_old: string | null = null;
  pwd_hash_new: string | null = null;
  pwd_show!: boolean;

  pwd_old_is_empty!: boolean;
  pwd_old_is_wrong!: boolean;
  pwd_new_not_identical!: boolean;

  validation_dialog_display = false;
  validation_dialog_parameter!: string;
  validation_dialog_text!: string[];

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // this.log.log('SystemConfigComponent.ngOnInit');

    this.setTitle(this.translate.instant('MENU.SYSTEM_CONFIGURATION'));

    this.dataService
      .getConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((configResponse) => {
        this.config = configResponse as SystemConfig;
        // this.log.log({configResponse});
        this.fillDialogData();
        this.cdr.markForCheck();
      });
  }

  fillDialogData() {
    this.lang = this.appConfig.defaultLanguage;
    this.fillCommonDialogData();
    this.fillHttpDialogData();
    this.fillWebsocketDialogData();
    this.fillAdminDialogData();
    this.fillMqttDialogData();
  }

  private hashPlainPasswords(data: Record<string, unknown>): void {
    if (data['password'] && data['password'] !== '') {
      if (!data['hashed_password']) {
        data['hashed_password'] = sha512(data['password'] as string);
        data['password'] = null;
      }
    }
    if (data['service_password'] && data['service_password'] !== '') {
      if (!data['service_hashed_password']) {
        data['service_hashed_password'] = sha512(data['service_password'] as string);
        data['service_password'] = null;
      }
    }
  }

  private buildSectionParams(section: ConfigSection, skip: string[] = []): ConfigParameter[] {
    const params: ConfigParameter[] = [];
    for (const param in section.meta.parameters) {
      if (section.meta.parameters.hasOwnProperty(param) && !skip.includes(param)) {
        params.push(this.fillParamData(section.meta, param, section.data));
      }
    }
    return params;
  }

  // ---------------------------------------------------------
  // Column definitions for parameter configuration tables
  //
  columnDefinitions() {
    const columnDefinitions: {
      field: string;
      sfield: string;
      header: string;
      width: string;
      iwidth?: string;
      iwidthwide?: string;
      paddingleft?: string;
    }[] = [
      { field: 'name', sfield: 'confname', header: 'PLUGIN.PARAMETER', width: '190px' },
      { field: 'type', sfield: 'conftype', header: 'PLUGIN.TYPE', width: '80px' },
      { field: 'value', sfield: 'paramvalue', header: 'PLUGIN.VALUE', width: '240px' },
      { field: 'desc', sfield: '', header: 'PLUGIN.DESCRIPTION', width: '' },
    ];

    const paddingRight = 6; // distance between rnd of value field and beginning of description
    const widthWide = 600; // width of wide value fields (gui_type: wide_str)

    for (let i = 0; i < columnDefinitions.length; i++) {
      const width = parseInt(columnDefinitions[i]['width'], 10);
      if (columnDefinitions[i]['width'] !== '') {
        columnDefinitions[i]['iwidth'] = String(width - paddingRight) + 'px';
      } else {
        columnDefinitions[i]['iwidth'] = '';
      }
      columnDefinitions[i]['iwidthwide'] = String(widthWide) + 'px';
      if (i === 2) {
        // if column = 2 (value) -> adjust padding for description (in column 3)
        columnDefinitions[3]['paddingleft'] = String(widthWide - width + paddingRight) + 'px';
      }
    }
    return columnDefinitions;
  }

  // ---------------------------------------------------------
  // Fill ParamData for display/editing of parameters
  //
  fillParamData(
    meta: { parameters: Record<string, ParameterMeta> },
    param: string,
    data: Record<string, unknown>,
  ) {
    // fill valuelist
    const vl: { label: string; value: unknown }[] = [];
    if (meta['parameters'][param]['valid_list'] !== undefined) {
      for (let i = 0; i < meta['parameters'][param]['valid_list'].length; i++) {
        vl.push({
          label: String(meta['parameters'][param]['valid_list'][i]),
          value: meta['parameters'][param]['valid_list'][i],
        });
      }
    }

    // generate a valid_list for bool parameters
    if (meta['parameters'][param]['type'] === 'bool') {
      vl.push({ label: 'true', value: true });
      vl.push({ label: 'false', value: false });
    }

    // fill description with active language
    //    const paramdesc = this.shared.getDescription(meta['parameters'][param]['description']);
    let paramdesc = '';
    if (meta['parameters'][param]['description'] !== undefined) {
      paramdesc = meta['parameters'][param]['description'][this.lang];
      if (paramdesc === '' || paramdesc === undefined) {
        paramdesc = meta['parameters'][param]['description'][this.shared.getFallbackLanguage()];
        if (paramdesc === '' || paramdesc === undefined) {
          paramdesc = meta['parameters'][param]['description'][this.shared.getFallbackLanguage(1)];
        }
      }
    }

    paramdesc = paramdesc.replace(new RegExp('\n', 'g'), '<br>');
    paramdesc = paramdesc.replace(new RegExp(' \\*\\*', 'g'), ' <b><mark>');
    paramdesc = paramdesc.replace(new RegExp('\\*\\* ', 'g'), '</mark></b> ');
    paramdesc = paramdesc.replace(new RegExp(' \\*', 'g'), ' <i><mark>');
    paramdesc = paramdesc.replace(new RegExp('\\* ', 'g'), '</mark></i> ');

    const paramdata = {
      name: param,
      type: meta['parameters'][param]['type'],
      gui_type: meta['parameters'][param]['gui_type'],
      valid_list: vl,
      valid_min: meta['parameters'][param]['valid_min'],
      valid_max: meta['parameters'][param]['valid_max'],
      default: meta['parameters'][param]['default'],
      mandatory: meta['parameters'][param]['mandatory'],
      value: data[param],
      desc: paramdesc,
    };

    if (paramdata.value === undefined) {
      paramdata.value = null;
    }

    return paramdata;
  }

  fillCommonDialogData() {
    this.common_parameter_cols = this.columnDefinitions();
    this.common_parameters = this.buildSectionParams(this.config.common);
    this.common_parameters_beforeEdit = JSON.parse(JSON.stringify(this.common_parameters));
  }

  fillHttpDialogData() {
    this.hashPlainPasswords(this.config.http.data);
    this.http_parameter_cols = this.columnDefinitions();
    this.http_parameters = this.buildSectionParams(this.config.http, [
      'password',
      'service_password',
    ]);
    this.http_parameters_beforeEdit = JSON.parse(JSON.stringify(this.http_parameters));
  }

  fillWebsocketDialogData() {
    this.hashPlainPasswords(this.config.websocket.data);
    this.websocket_parameter_cols = this.columnDefinitions();
    this.websocket_parameters = this.buildSectionParams(this.config.websocket, [
      'password',
      'service_password',
    ]);
    this.websocket_parameters_beforeEdit = JSON.parse(JSON.stringify(this.websocket_parameters));
  }

  fillAdminDialogData() {
    this.admin_parameter_cols = this.columnDefinitions();
    this.admin_parameters = this.buildSectionParams(this.config.admin);
    this.admin_parameters_beforeEdit = JSON.parse(JSON.stringify(this.admin_parameters));
  }

  fillMqttDialogData() {
    this.mqtt_parameter_cols = this.columnDefinitions();
    this.mqtt_parameters = this.buildSectionParams(this.config.mqtt);
    this.mqtt_parameters_beforeEdit = JSON.parse(JSON.stringify(this.mqtt_parameters));
  }

  // ---------------------------------------------------------
  // change password
  //
  change_password_dialog($event: unknown, rowData: ConfigParameter, col_field: string) {
    this.log.log('change_password_dialog()');
    this.log.log('hash', rowData[col_field]);
    this.pwd_hash_old = rowData[col_field] as string | null;
    this.pwd_rowData = rowData;
    this.pwd_col = col_field;

    this.pwd_old = null;
    this.pwd_new1 = null;
    this.pwd_new2 = null;
    this.pwd_old_is_wrong = false;
    this.pwd_change_dialog_display = true;
  }

  change_password($event: unknown) {
    this.log.log('change_password()');
    this.pwd_old_is_empty = false;
    this.pwd_old_is_wrong = false;
    this.pwd_new_not_identical = false;

    if (this.pwd_hash_old !== null) {
      if (this.pwd_old === null || this.pwd_old === '') {
        this.pwd_old_is_empty = true;
        return;
      }

      // const wrk = sha512(this.pwd_old);
      if (this.pwd_hash_old !== sha512(this.pwd_old)) {
        this.pwd_old_is_wrong = true;
        return;
      }
    }
    if (this.pwd_new1 !== this.pwd_new2) {
      this.pwd_new_not_identical = true;
      return;
    }

    this.log.log('pwd_new1', this.pwd_new1);
    this.log.log('pwd_new2', this.pwd_new2);

    this.pwd_hash_new = null;
    if (this.pwd_new1 !== null) {
      this.pwd_hash_new = sha512(this.pwd_new1);
    }
    this.log.log('pwd_hash_new', this.pwd_hash_new);

    this.pwd_rowData![this.pwd_col!] = this.pwd_hash_new;
    this.pwd_change_dialog_display = false;
    this.check_values();
  }

  check_values(_type?: string) {
    this.data_changed = false;
    for (const p in this.common_parameters) {
      if (this.common_parameters.hasOwnProperty(p)) {
        if (this.common_parameters[p].value !== this.common_parameters_beforeEdit[p].value) {
          this.data_changed = true;
          // this.log.log(this.common_parameters[p]);
        }
      }
    }
    for (const p in this.http_parameters) {
      if (this.http_parameters.hasOwnProperty(p)) {
        if (this.http_parameters[p].value !== this.http_parameters_beforeEdit[p].value) {
          this.data_changed = true;
          // this.log.log(this.http_parameters[p]);
        }
      }
    }
    for (const p in this.websocket_parameters) {
      if (this.websocket_parameters.hasOwnProperty(p)) {
        if (this.websocket_parameters[p].value !== this.websocket_parameters_beforeEdit[p].value) {
          this.data_changed = true;
          // this.log.log(this.websocket_parameters[p]);
        }
      }
    }
    for (const p in this.admin_parameters) {
      if (this.admin_parameters.hasOwnProperty(p)) {
        if (this.admin_parameters[p].value !== this.admin_parameters_beforeEdit[p].value) {
          this.data_changed = true;
          // this.log.log(this.admin_parameters[p]);
        }
      }
    }
    for (const p in this.mqtt_parameters) {
      if (this.mqtt_parameters.hasOwnProperty(p)) {
        if (this.mqtt_parameters[p].value !== this.mqtt_parameters_beforeEdit[p].value) {
          this.data_changed = true;
          // this.log.log(this.admin_parameters[p]);
        }
      }
    }
  }

  check_value_restrictions(parameter: ConfigParameter) {
    let error_found = false;
    let error_text = '';

    // this.log.log('check_value_restrictions', {parameter});

    if (parameter['value'] === undefined) {
      parameter['value'] = null;
    }

    const type = (parameter.type ?? '').toLowerCase();
    const value = parameter.value as string;
    const numVal = Number(parameter.value);
    const validMin = parameter['valid_min'] as number | undefined;
    const validMax = parameter['valid_max'] as number | undefined;

    // checking data types
    if (parameter.value !== null && parameter.value !== '') {
      error_text = "'" + value + "' ";
      if (type === 'knx_ga' && !this.shared.is_knx_groupaddress(value)) {
        error_found = true;
        error_text += this.translate.instant('PLUGIN.INVALID_KNX_ADDRESS');
      }
      if (type === 'mac' && !this.shared.is_mac(value)) {
        error_found = true;
        error_text += this.translate.instant('PLUGIN.INVALID_MAC_ADDRESS');
      }
      if (type === 'ipv4' && !this.shared.is_ipv4(value)) {
        error_found = true;
        error_text += this.translate.instant('PLUGIN.INVALID_IP_ADDRESS') + ' (v4)';
      }
      if (type === 'ipv6' && !this.shared.is_ipv6(value)) {
        error_found = true;
        error_text += this.translate.instant('PLUGIN.INVALID_IP_ADDRESS') + ' (v6)';
      }
      if (type === 'ip') {
        if (!this.shared.is_ipv4(value) && !this.shared.is_ipv6(value)) {
          if (!this.shared.is_hostname(value)) {
            error_found = true;
            error_text += this.translate.instant('PLUGIN.INVALID_HOSTNAME');
          }
        }
      }
    }

    // check valid minimum and maximum value
    if (parameter.value !== null && validMin !== undefined && numVal < validMin) {
      error_found = true;
      error_text = this.translate.instant('PLUGIN.DEFINED_MIN') + " '" + validMin + "'";
      error_text += ', ' + this.translate.instant('PLUGIN.ACTUAL_VALUE') + " '" + value + "'";
    }
    if (parameter.value !== null && validMax !== undefined && numVal > validMax) {
      error_found = true;
      error_text = this.translate.instant('PLUGIN.DEFINED_MAX') + " '" + validMax + "'";
      error_text += ', ' + this.translate.instant('PLUGIN.ACTUAL_VALUE') + " '" + value + "'";
    }

    // check if value is mandantory
    if ((parameter.value === null || parameter.value === '') && parameter['mandatory']) {
      error_found = true;
      error_text = this.translate.instant('PLUGIN.MANDATORY_VALUE');
    }

    if (error_found) {
      this.validation_dialog_text.push(
        this.translate.instant('PLUGIN.PARAMETER') + " '" + parameter['name'] + "': " + error_text,
      );
      this.validation_dialog_parameter = parameter['name'];

      this.validation_dialog_display = true;
      this.log.warn('Parameter ' + "'" + parameter['name'] + "'", error_text);
      return false;
    }
    return true;
  }

  saveSettings() {
    let errors_found = false;
    this.validation_dialog_text = [];

    for (const p in this.common_parameters) {
      if (this.common_parameters.hasOwnProperty(p)) {
        if (!this.check_value_restrictions(this.common_parameters[p])) {
          errors_found = true;
        }
      }
    }
    for (const p in this.http_parameters) {
      if (this.http_parameters.hasOwnProperty(p)) {
        if (!this.check_value_restrictions(this.http_parameters[p])) {
          errors_found = true;
        }
      }
    }
    for (const p in this.websocket_parameters) {
      if (this.websocket_parameters.hasOwnProperty(p)) {
        if (!this.check_value_restrictions(this.websocket_parameters[p])) {
          errors_found = true;
        }
      }
    }
    for (const p in this.admin_parameters) {
      if (this.admin_parameters.hasOwnProperty(p)) {
        if (!this.check_value_restrictions(this.admin_parameters[p])) {
          errors_found = true;
        }
      }
    }
    for (const p in this.mqtt_parameters) {
      if (this.mqtt_parameters.hasOwnProperty(p)) {
        if (!this.check_value_restrictions(this.mqtt_parameters[p])) {
          errors_found = true;
        }
      }
    }

    if (errors_found) {
      return;
    }

    const data: Record<string, any> = {};
    data['common'] = {};
    data['common']['data'] = {};
    for (const p in this.common_parameters) {
      if (this.common_parameters.hasOwnProperty(p)) {
        if (this.common_parameters[p].value === '' && this.common_parameters[p].type === 'str') {
          this.common_parameters[p].value = null;
        }
        data['common']['data'][this.common_parameters[p].name] = this.common_parameters[p].value;
      }
    }

    data['http'] = {};
    data['http']['data'] = {};
    for (const p in this.http_parameters) {
      if (this.http_parameters.hasOwnProperty(p)) {
        if (this.http_parameters[p].value === '' && this.http_parameters[p].type === 'str') {
          this.http_parameters[p].value = null;
        }
        data['http']['data'][this.http_parameters[p].name] = this.http_parameters[p].value;
      }
    }
    // remove plain passwords
    data['http']['data']['password'] = null;
    data['http']['data']['service_password'] = null;

    data['websocket'] = {};
    data['websocket']['data'] = {};
    for (const p in this.websocket_parameters) {
      if (this.websocket_parameters.hasOwnProperty(p)) {
        if (
          this.websocket_parameters[p].value === '' &&
          this.websocket_parameters[p].type === 'str'
        ) {
          this.websocket_parameters[p].value = null;
        }
        data['websocket']['data'][this.websocket_parameters[p].name] =
          this.websocket_parameters[p].value;
      }
    }

    data['admin'] = {};
    data['admin']['data'] = {};
    for (const p in this.admin_parameters) {
      if (this.admin_parameters.hasOwnProperty(p)) {
        if (this.admin_parameters[p].value === '' && this.admin_parameters[p].type === 'str') {
          this.admin_parameters[p].value = null;
        }
        data['admin']['data'][this.admin_parameters[p].name] = this.admin_parameters[p].value;
      }
    }

    data['mqtt'] = {};
    data['mqtt']['data'] = {};
    for (const p in this.mqtt_parameters) {
      if (this.mqtt_parameters.hasOwnProperty(p)) {
        if (this.mqtt_parameters[p].value === '' && this.mqtt_parameters[p].type === 'str') {
          this.mqtt_parameters[p].value = null;
        }
        data['mqtt']['data'][this.mqtt_parameters[p].name] = this.mqtt_parameters[p].value;
        // this.log.warn(this.mqtt_parameters[p].name, this.mqtt_parameters[p].type, this.mqtt_parameters[p].value);
      }
    }

    this.dataService
      .saveConfig(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: boolean) => {
        if (result) {
          this.log.log('saveSettings', 'success');

          this.common_parameters_beforeEdit = JSON.parse(JSON.stringify(this.common_parameters));
          this.http_parameters_beforeEdit = JSON.parse(JSON.stringify(this.http_parameters));
          this.websocket_parameters_beforeEdit = JSON.parse(
            JSON.stringify(this.websocket_parameters),
          );
          this.admin_parameters_beforeEdit = JSON.parse(JSON.stringify(this.admin_parameters));
          this.mqtt_parameters_beforeEdit = JSON.parse(JSON.stringify(this.mqtt_parameters));

          this.data_changed = false;
          this.restart_core_button = true;
          this.cdr.markForCheck();
        } else {
          this.log.warn('saveSettings', 'fail');
        }
      });
  }

  restartShng() {
    this.dataServiceServer
      .restartShngServer()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const res = response as { result?: string };
        this.log.log('restartShng', res.result);
      });
    this.restart_core_button = false;
  }
}
