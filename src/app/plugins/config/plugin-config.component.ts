import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { AppConfigService } from '../../common/services/app-config.service';

import {
  faExclamationTriangle,
  faLaptopCode,
  faPlus,
  faPlusCircle,
  faPlusSquare,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LogService } from '../../common/services/log.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SharedService } from '../../common/services/shared.service';

import { NgOptimizedImage, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel } from 'primeng/accordion';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Ripple } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AppComponent } from '../../app.component';
import { DynamicFieldComponent } from '../../common/components/dynamic-field/dynamic-field.component';
import { ConfigParameter, TableColumn } from '../../common/models/interfaces';
import { PluginsConfig } from '../../common/models/plugins-config';
import { PluginsInstalled } from '../../common/models/plugins-installed';
import { ServerInfo } from '../../common/models/server-info';

interface PluginParamMeta {
  type?: string;
  gui_type?: string;
  valid_list?: unknown[];
  valid_min?: number;
  valid_max?: number;
  default?: unknown;
  mandatory?: boolean;
  description?: Record<string, string>;
  hide?: boolean;
}

interface PluginMetaInfo {
  plugin?: {
    state?: string;
    type?: string;
    description?: Record<string, string>;
  };
  parameters?: Record<string, PluginParamMeta>;
}

interface PluginSectionConfig {
  plugin_name?: string;
  class_path?: string;
  instance?: string;
  _meta?: PluginMetaInfo;
  _loaded?: boolean;
  plugin_enabled?: boolean | string;
  _description?: unknown;
  [key: string]: unknown;
}

export interface ConfiguredPlugin {
  confname: string;
  instance: string;
  plugin: string;
  desc: string;
  loaded: boolean;
  enabled: string;
  type?: string;
}

@Component({
  selector: 'app-config',
  templateUrl: './plugin-config.component.html',
  styleUrls: ['./plugin-config.component.css'],
  providers: [AppComponent],
  imports: [
    Bind,
    ProgressSpinner,
    ButtonDirective,
    NgOptimizedImage,
    FaIconComponent,
    Dialog,
    PrimeTemplate,
    ToggleSwitch,
    FormsModule,
    TableModule,
    NgStyle,
    DynamicFieldComponent,
    Accordion,
    AccordionPanel,
    Ripple,
    AccordionHeader,
    AccordionContent,
    InputText,
    TranslatePipe,
  ],
})
export class PluginConfigComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private pluginsdataService = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private shared = inject(SharedService);
  private router = inject(Router);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  faPlus = faPlus;
  faPlusCircle = faPlusCircle;
  faPlusSquare = faPlusSquare;
  faExclamationTriangle = faExclamationTriangle; // signal deprecated plugin
  faCode = faLaptopCode; // signal plugin in state "develop"

  configuredplugins!: ConfiguredPlugin[];
  cols!: TableColumn[];
  pluginconflist!: PluginsConfig;
  server_info!: ServerInfo;
  lang!: string;

  // display modal edit dialog
  parameters!: ConfigParameter[];
  plugin_enabled!: boolean;
  parameter_cols!: TableColumn[];
  classic = false;
  state = '';
  rowclicked_foredit: ConfiguredPlugin | false = false;

  // for list of installed plugins dialog
  dialog_display = false;
  dialog_readonly = false;
  dialog_configname!: string;
  dialog_pluginname!: string;
  dialog_description!: string;

  // for add dialog
  add_display = false;
  plugintypes: string[] = ['system', 'gateway', 'interface', 'protocol', 'web', 'unclassified'];
  plugintypes_expanded: boolean[] = [];
  spinner_display = false;
  spinner_header = "{{'PLUGIN.LOADLIST'|translate}}...";
  add_firstrun = true;
  plugins_installed!: PluginsInstalled;
  plugins_installed_list!: string[];

  // set configuration name dialog
  setconfig_display = false;
  selected_plugin!: string;
  pluginconfig_name!: string;
  translate_params: {} = {};
  add_enabled!: boolean;

  // new-plugin configure-and-load workflow
  is_new_plugin = false;
  load_error: string | null = null;
  save_error: string | null = null;

  validation_dialog_display = false;
  validation_dialog_parameter!: string;
  validation_dialog_text!: string[];

  // confirm delete dialog
  confirmdelete_display = false;
  delete_param!: {};

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.spinner_display = true;
    this.spinner_header = this.translate.instant('PLUGIN.LOADCONFIG');

    this.shared.setGuiLanguage();
    this.setTitle(this.translate.instant('PLUGIN.PLUGIN_CONFIGURATION'));
    this.spinner_header = this.translate.instant('PLUGIN.LOADCONFIG');
    this.reloadPluginList();

    this.cols = [
      { field: 'enabled', sfield: '', header: '' },
      { field: 'type', sfield: '', header: '' },
      { field: 'confname', sfield: 'confname', header: 'PLUGIN.CONFIGNAME' },
      { field: 'plugin', sfield: 'plugin', header: 'PLUGIN.PLUGINNAME', min_width: '200px' },
      { field: 'instance', sfield: 'instance', header: 'PLUGIN.INSTANCE', min_width: '120px' },
      { field: 'desc', sfield: '', header: 'PLUGIN.DESCRIPTION' },
    ];

    this.configuredplugins = [];
  }

  // ---------------------------------------------------------------
  //  Fetch the plugin config from the backend and rebuild the list.
  //  Optionally runs a callback once the list is ready.
  //
  private reloadPluginList(afterLoad?: () => void): void {
    this.pluginsdataService
      .getPluginsConfig()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.spinner_display = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((response) => {
        this.pluginconflist = response as PluginsConfig;
        this.buildConfiguredPlugins();
        if (afterLoad) afterLoad();
      });
  }

  // ---------------------------------------------------------------
  //  Rebuild configuredplugins from this.pluginconflist.
  //
  private buildConfiguredPlugins(): void {
    const newPlugins: ConfiguredPlugin[] = [];
    const plugin_config = this.pluginconflist?.plugin_config as Record<string, PluginSectionConfig>;
    for (const plg in plugin_config) {
      if (plugin_config.hasOwnProperty(plg)) {
        const confname = plg;
        const plgname = (plugin_config[plg].plugin_name ?? plugin_config[plg].class_path) as
          | string
          | undefined;
        const instance = plugin_config[plg].instance;

        const meta = plugin_config[confname]._meta;

        let deprecated = '-';
        if (meta?.plugin) {
          if (meta.plugin.state && meta.plugin.state.toLowerCase() === 'deprecated') {
            deprecated = '+';
          } else if (meta.plugin.state && meta.plugin.state.toLowerCase() === 'develop') {
            deprecated = 'd';
          } else {
            deprecated = '-';
          }
        }
        const conf: ConfiguredPlugin = {
          confname: confname,
          instance: instance ?? '',
          plugin: deprecated + (plgname ?? ''),
          desc: '',
          loaded: !!plugin_config[plg]._loaded,
          enabled: 'true',
        };

        if (plugin_config[plg].plugin_enabled === 'False') {
          conf.enabled = 'false';
        }

        if (meta == null || !meta.plugin) {
          conf.type = 'classic';
        } else {
          conf.type = meta.plugin.type;
        }

        let desc: unknown = plugin_config[plg]._description;
        if (conf.type === undefined || conf.type === 'classic') {
          conf.type = 'classic';
          if (plugin_config[plg]._meta != null) {
            desc = plugin_config[plg]._meta?.plugin?.description;
          }
        }
        let plgdesc = this.shared.getDescription(desc as Record<string, string> | null | undefined);
        plgdesc = plgdesc.replace(new RegExp('\n', 'g'), '<br>');
        plgdesc = plgdesc.replace(new RegExp(' \\*\\*', 'g'), ' <b><mark>');
        plgdesc = plgdesc.replace(new RegExp('\\*\\* ', 'g'), '</mark></b> ');
        plgdesc = plgdesc.replace(new RegExp(' \\*', 'g'), ' <i><mark>');
        plgdesc = plgdesc.replace(new RegExp('\\* ', 'g'), '</mark></i> ');
        conf.desc = plgdesc;

        newPlugins.push(conf);
      }
    }
    this.configuredplugins = newPlugins;
    this.cdr.markForCheck();
  }

  listToString(list: string | string[] | undefined) {
    let result = '';
    if (typeof list === 'string') {
      result = list;
    } else {
      if (list !== undefined) {
        for (let i = 0; i < list.length; i++) {
          if (i > 0) {
            result += ' | ';
          }
          result += list[i];
        }
      }
    }
    return result;
  }

  stringToList(str: string | null | undefined) {
    if (str === null || str === undefined) {
      return [];
    }
    if (str.trim() === '') {
      return [];
    }
    const list = str.split('|');
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i].trim();
    }
    return list;
  }

  // ---------------------------------------------------------
  // Handle the click event on the list of installed plugins
  //
  //  - Get the configuration data for the selected plugin
  //    for the modal dialog
  //
  rowClicked(event: unknown, rowdata: ConfiguredPlugin) {
    this.dialog_configname = rowdata.confname;
    this.dialog_pluginname = rowdata.plugin.slice(1);
    this.rowclicked_foredit = rowdata;

    const pconf = this.pluginconflist.plugin_config as Record<string, PluginSectionConfig>;
    const conf = pconf[rowdata.confname];
    this.log.log({ conf });
    const meta = pconf[rowdata.confname]._meta;
    let desc: Record<string, string> | null = null;
    this.classic = true;
    if (meta != null && meta !== undefined && meta.plugin !== undefined) {
      if (meta.plugin.type !== undefined && meta.plugin.type !== 'classic') {
        this.classic = false;
      }
      this.state = '';
      if (meta.plugin.state !== undefined) {
        this.state = meta.plugin.state;
      }
      desc = meta.plugin.description ?? null;
    }
    this.dialog_readonly = this.pluginconflist.readonly;
    this.dialog_description = this.shared.getDescription(desc);

    this.plugin_enabled = true;
    if (conf.plugin_enabled !== undefined) {
      this.log.log('typeof conf.plugin_enabled', typeof conf.plugin_enabled);
      if (typeof conf.plugin_enabled === 'boolean') {
        this.plugin_enabled = conf.plugin_enabled;
      } else if (
        typeof conf.plugin_enabled === 'string' &&
        conf.plugin_enabled.toLowerCase() === 'false'
      ) {
        this.plugin_enabled = false;
      }
    }

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

    const paddingRight = 6;
    const widthWide = 600;

    for (let i = 0; i < columnDefinitions.length; i++) {
      const width = parseInt(columnDefinitions[i]['width'], 10);
      if (columnDefinitions[i]['width'] !== '') {
        columnDefinitions[i]['iwidth'] = String(width - paddingRight) + 'px';
      } else {
        columnDefinitions[i]['iwidth'] = '';
      }
      columnDefinitions[i]['iwidthwide'] = String(widthWide) + 'px';
      if (i === 2) {
        columnDefinitions[3]['paddingleft'] = String(widthWide - width + paddingRight) + 'px';
      }
    }

    this.parameter_cols = columnDefinitions;
    this.parameters = [];

    this.lang = this.appConfig.defaultLanguage;
    const metaParams = meta?.parameters ?? {};
    if (meta != null && meta !== undefined && (meta.parameters as unknown) !== 'NONE') {
      for (const param in metaParams) {
        if (metaParams.hasOwnProperty(param)) {
          const pm = metaParams[param];
          const vl: { label: string; value: unknown }[] = [];
          if (pm.valid_list !== undefined) {
            for (let i = 0; i < pm.valid_list.length; i++) {
              const wrk = {
                label: String(pm.valid_list[i]),
                value: pm.valid_list[i],
              };
              vl.push(wrk);
            }
          }

          if (pm.type === 'bool') {
            vl.push({ label: 'true', value: true });
            vl.push({ label: 'false', value: false });
          }

          let paramdesc = '';
          if (pm.description !== undefined) {
            paramdesc = pm.description[this.lang];
            if (paramdesc === '' || paramdesc === undefined) {
              paramdesc = pm.description[this.shared.getFallbackLanguage()];
              if (paramdesc === '' || paramdesc === undefined) {
                paramdesc = pm.description[this.shared.getFallbackLanguage(1)];
              }
            }
          }

          const paramdescBlocks: string[] = [];
          paramdescBlocks.push(paramdesc);

          paramdesc = paramdesc.replace(new RegExp('\n', 'g'), '<br>');
          paramdesc = paramdesc.replace(new RegExp(' \\*\\*', 'g'), ' <b><mark>');
          paramdesc = paramdesc.replace(new RegExp('\\*\\* ', 'g'), '</mark></b> ');
          paramdesc = paramdesc.replace(new RegExp(' \\*', 'g'), ' <i><mark>');
          paramdesc = paramdesc.replace(new RegExp('\\* ', 'g'), '</mark></i> ');

          const paramdata = {
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
            paramdata['default'] = this.listToString(pm.default as string | string[] | undefined);
          }
          if (pm.hide && ['str', 'int'].indexOf(pm.type ?? '') !== -1) {
            paramdata['type'] = 'hide' + '-' + pm.type;
          }

          const initial_unset = conf[param] === undefined || conf[param] === null;
          paramdata.initial_unset = initial_unset;

          if (paramdata.type === 'bool') {
            if (conf[param] === undefined || conf[param] === null) {
              if (initial_unset && paramdata.default != null) {
                paramdata.value =
                  typeof paramdata.default === 'boolean'
                    ? paramdata.default
                    : String(paramdata.default).toLowerCase() === 'true';
              } else {
                paramdata.value = null;
              }
            } else if (typeof conf[param] === 'boolean') {
              paramdata.value = conf[param];
            } else {
              paramdata.value = (conf[param] as string).toLowerCase() === 'true';
            }
          } else if (paramdata.type === 'list') {
            paramdata.value =
              initial_unset && paramdata.default != null
                ? paramdata.default
                : this.listToString(conf[param] as string);
          } else if (paramdata.type === 'int') {
            paramdata.value =
              initial_unset && paramdata.default != null
                ? typeof paramdata.default === 'number'
                  ? paramdata.default
                  : parseInt(String(paramdata.default), 10)
                : parseInt(conf[param] as string, 10);
          } else {
            paramdata.value =
              initial_unset && paramdata.default != null
                ? String(paramdata.default)
                : (conf[param] as string);
          }

          this.parameters.push(paramdata);
        }
      }
    }

    this.dialog_display = true;
  }

  saveConfig() {
    const pluginConf = this.pluginconflist.plugin_config as Record<string, PluginSectionConfig>;
    const conf = pluginConf[this.dialog_configname];

    let errors_found = false;
    this.validation_dialog_text = [];
    for (let i = 0; i < this.parameters.length; i++) {
      let error_found = false;
      let error_text = '';
      const isUnchangedDefault =
        this.parameters[i]['initial_unset'] &&
        this.parameters[i]['default'] != null &&
        String(this.parameters[i]['value']) === String(this.parameters[i]['default']);

      if (
        this.parameters[i]['value'] === '' ||
        this.parameters[i]['value'] === null ||
        isUnchangedDefault
      ) {
        conf[this.parameters[i]['name']] = undefined;
      } else {
        conf[this.parameters[i]['name']] = this.parameters[i]['value'];
      }

      if (this.parameters[i]['value'] === undefined) {
        this.parameters[i]['value'] = null;
      }

      if (this.parameters[i]['value'] !== null && this.parameters[i]['value'] !== '') {
        const ptype = String(this.parameters[i]['type']).toLowerCase();
        const pvalue = this.parameters[i]['value'] as string;
        error_text = "'" + pvalue + "' ";
        if (ptype === 'knx_ga' && !this.shared.is_knx_groupaddress(pvalue)) {
          error_found = true;
          error_text += this.translate.instant('PLUGIN.INVALID_KNX_ADDRESS');
        }
        if (ptype === 'mac' && !this.shared.is_mac(pvalue)) {
          error_found = true;
          error_text += this.translate.instant('PLUGIN.INVALID_MAC_ADDRESS');
        }
        if (ptype === 'ipv4' && !this.shared.is_ipv4(pvalue)) {
          error_found = true;
          error_text += this.translate.instant('PLUGIN.INVALID_IP_ADDRESS') + ' (v4)';
        }
        if (ptype === 'ipv6' && !this.shared.is_ipv6(pvalue)) {
          error_found = true;
          error_text += this.translate.instant('PLUGIN.INVALID_IP_ADDRESS') + ' (v6)';
        }
        if (ptype === 'ip') {
          if (!this.shared.is_ipv4(pvalue) && !this.shared.is_ipv6(pvalue)) {
            if (!this.shared.is_hostname(pvalue)) {
              error_found = true;
              error_text += this.translate.instant('PLUGIN.INVALID_HOSTNAME');
            }
          }
        }
      }

      if (
        this.parameters[i]['value'] !== null &&
        (this.parameters[i]['value'] as number) < (this.parameters[i]['valid_min'] as number)
      ) {
        error_found = true;
        error_text =
          this.translate.instant('PLUGIN.DEFINED_MIN') +
          " '" +
          this.parameters[i]['valid_min'] +
          "'";
        error_text +=
          ', ' +
          this.translate.instant('PLUGIN.ACTUAL_VALUE') +
          " '" +
          this.parameters[i]['value'] +
          "'";
      }
      if (
        this.parameters[i]['value'] !== null &&
        (this.parameters[i]['value'] as number) > (this.parameters[i]['valid_max'] as number)
      ) {
        error_found = true;
        error_text =
          this.translate.instant('PLUGIN.DEFINED_MAX') +
          " '" +
          this.parameters[i]['valid_max'] +
          "'";
        error_text +=
          ', ' +
          this.translate.instant('PLUGIN.ACTUAL_VALUE') +
          " '" +
          this.parameters[i]['value'] +
          "'";
      }

      if (
        (this.parameters[i]['value'] === undefined ||
          this.parameters[i]['value'] === null ||
          this.parameters[i]['value'] === '') &&
        this.parameters[i]['mandatory']
      ) {
        error_found = true;
        error_text = this.translate.instant('PLUGIN.MANDATORY_VALUE');
      }

      if (error_found) {
        errors_found = true;
        error_found = false;
        this.validation_dialog_text.push(
          this.translate.instant('PLUGIN.PARAMETER') +
            " '" +
            this.parameters[i]['name'] +
            "': " +
            error_text,
        );
        this.validation_dialog_parameter = this.parameters[i]['name'];

        this.validation_dialog_display = true;
      }
    }

    if (!errors_found) {
      this.dialog_display = false;
      this.save_error = null;

      const saveParams = pluginConf[this.dialog_configname]._meta?.parameters ?? {};
      for (const param of Object.keys(saveParams)) {
        if (
          saveParams[param].type === 'list' &&
          pluginConf[this.dialog_configname][param] !== undefined
        ) {
          pluginConf[this.dialog_configname][param] = this.stringToList(
            pluginConf[this.dialog_configname][param] as string,
          );
        }
      }

      if (this.plugin_enabled === false) {
        pluginConf[this.dialog_configname]['plugin_enabled'] = false;
        if (this.rowclicked_foredit) this.rowclicked_foredit.enabled = 'false';
      } else {
        pluginConf[this.dialog_configname]['plugin_enabled'] = true;
        if (this.rowclicked_foredit) this.rowclicked_foredit.enabled = 'true';
      }
      if (this.rowclicked_foredit)
        this.rowclicked_foredit.instance = pluginConf[this.dialog_configname].instance ?? '';

      const config = JSON.parse(JSON.stringify(pluginConf[this.dialog_configname]));
      delete config['_meta'];
      delete config['_description'];
      for (const conf in config) {
        if (config.hasOwnProperty(conf)) {
          if (config[conf] === null) {
            delete config[conf];
          }
        }
      }

      const wasNewPlugin = this.is_new_plugin;
      const configname = this.dialog_configname;

      this.pluginsdataService
        .setPluginConfig(configname, { config: config })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          if (response === true) {
            if (wasNewPlugin) {
              this.loadNewPlugin(configname);
            } else {
              this.cdr.markForCheck();
            }
          } else {
            this.save_error = this.translate.instant('PLUGIN.SAVE_FAILED');
            this.dialog_display = true;
            this.cdr.markForCheck();
          }
        });
    }
  }

  // ---------------------------------------------------------------
  //  Load a freshly configured plugin on the fly via the API.
  //  Called after saveConfig() succeeds for a newly added plugin.
  //
  private loadNewPlugin(configname: string): void {
    this.spinner_display = true;
    this.spinner_header = this.translate.instant('PLUGIN.LOADING');

    this.pluginsdataService
      .setPluginState(configname, 'load')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.spinner_display = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.is_new_plugin = false;
        if (result === true) {
          this.load_error = null;
          this.reloadPluginList();
        } else {
          this.load_error = this.translate.instant('PLUGIN.LOAD_FAILED');
          this.dialog_display = true;
        }
      });
  }

  closeDialog() {
    this.dialog_display = false;
    this.is_new_plugin = false;
    this.load_error = null;
    this.save_error = null;
  }

  private _runLifecycleAction(
    configname: string,
    action: 'load' | 'unload' | 'reload',
    fromDialog: boolean,
  ): void {
    const spinnerKey = {
      load: 'PLUGIN.LOADING',
      unload: 'PLUGIN.UNLOADING',
      reload: 'PLUGIN.RELOADING',
    };
    const errorKey = {
      load: 'PLUGIN.LOAD_FAILED',
      unload: 'PLUGIN.UNLOAD_FAILED',
      reload: 'PLUGIN.RELOAD_FAILED',
    };

    this.spinner_display = true;
    this.spinner_header = this.translate.instant(spinnerKey[action]);

    this.pluginsdataService
      .setPluginState(configname, action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.spinner_display = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        if (result === true) {
          this.load_error = null;
          this.reloadPluginList();
        } else {
          this.load_error = this.translate.instant(errorKey[action]);
          if (fromDialog) {
            this.dialog_display = true;
          }
          this.cdr.markForCheck();
        }
      });
  }

  loadPlugin(confname?: string): void {
    const fromDialog = confname === undefined;
    this.dialog_display = false;
    this._runLifecycleAction(confname ?? this.dialog_configname, 'load', fromDialog);
  }

  unloadPlugin(confname?: string): void {
    const fromDialog = confname === undefined;
    this.dialog_display = false;
    this._runLifecycleAction(confname ?? this.dialog_configname, 'unload', fromDialog);
  }

  reloadPlugin(confname?: string): void {
    const fromDialog = confname === undefined;
    this.dialog_display = false;
    this._runLifecycleAction(confname ?? this.dialog_configname, 'reload', fromDialog);
  }

  // -------------------------------------------------------------------
  //  Add configuration
  //
  addPluginDialog() {
    this.log.log('PluginConfigComponent.addPluginDialog:');

    for (let i = 0; i < this.plugintypes.length; i++) {
      this.plugintypes_expanded[i] = !this.add_firstrun;
    }
    this.add_firstrun = false;

    this.spinner_header = this.translate.instant('PLUGIN.LOADLIST');
    this.spinner_display = true;
    this.pluginsdataService
      .getInstalledPlugins()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.plugins_installed = <PluginsInstalled>response;
        this.plugins_installed_list = Object.keys(<PluginsInstalled>response);
        this.log.log('addPluginDialog', { response });

        this.spinner_display = false;
        this.add_display = true;

        for (let p in this.plugins_installed) {
          if (p in this.plugins_installed) {
            this.plugins_installed[p]['disp_description'] = this.shared.getDescription(
              this.plugins_installed[p].description as Record<string, string>,
            );
          }
        }
        for (let i = 0; i < this.plugintypes.length; i++) {
          this.plugintypes_expanded[i] = false;
        }
        this.cdr.markForCheck();
      });
  }

  selectPlugin(iplugin: string) {
    this.log.warn({ iplugin });
    this.selected_plugin = iplugin;
    this.pluginconfig_name = iplugin;
    this.translate_params = { selected_plugin: this.selected_plugin };
    this.checkInput();

    this.setconfig_display = true;
  }

  checkInput() {
    this.add_enabled = false;
    if (this.pluginconfig_name.length > 0) {
      this.add_enabled = true;
      for (const conf in this.configuredplugins) {
        if (this.configuredplugins[conf].confname === this.pluginconfig_name) {
          this.add_enabled = false;
        }
      }
    }
    this.log.warn(this.add_enabled);
    return this.add_enabled;
  }

  addPlugin() {
    if (!this.checkInput()) return;

    const configname = this.pluginconfig_name;
    const pluginname = this.selected_plugin;

    this.setconfig_display = false;
    this.add_display = false;

    const config = { plugin_name: pluginname, plugin_enabled: true };

    this.spinner_display = true;
    this.spinner_header = this.translate.instant('PLUGIN.ADDING');

    this.pluginsdataService
      .addPluginConfig(configname, { config })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        if (response === true) {
          this.spinner_header = this.translate.instant('PLUGIN.LOADCONFIG');
          this.reloadPluginList();
        } else {
          this.spinner_display = false;
          this.cdr.markForCheck();
        }
      });
  }

  // -------------------------------------------------------------------
  //  Delete configuration
  //
  DeleteConfig() {
    this.log.log('PluginConfigComponent.DeleteConfig:');
    this.log.warn(this.dialog_configname);

    this.delete_param = { config: this.dialog_configname };

    this.confirmdelete_display = true;
  }

  DeleteConfigConfirm() {
    this.confirmdelete_display = false;

    const configname = this.dialog_configname;
    const delete$ = this.pluginsdataService
      .deletePluginConfig(configname)
      .pipe(takeUntilDestroyed(this.destroyRef));

    const action$ =
      this.rowclicked_foredit && this.rowclicked_foredit.loaded
        ? this.pluginsdataService.setPluginState(configname, 'unload').pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap(() => delete$),
          )
        : delete$;

    action$.subscribe((response) => {
      if (response) {
        this.dialog_display = false;
        this.spinner_display = true;
        this.spinner_header = this.translate.instant('PLUGIN.LOADCONFIG');
        this.reloadPluginList();
        this.cdr.markForCheck();
      } else {
        this.log.error('PluginConfigComponent.DeleteConfigConfirm: delete failed');
      }
    });

    return true;
  }

  DeleteConfigAbort() {
    this.log.log('PluginConfigComponent.DeleteConfigAbort:');

    this.confirmdelete_display = false;

    return false;
  }
}
