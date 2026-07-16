import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize, map, switchMap } from 'rxjs/operators';
import { AppConfigService } from '../../common/services/app-config.service';

import {
  faCircle,
  faExclamationTriangle,
  faLaptopCode,
  faPlus,
  faPlusCircle,
  faPlusSquare,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { LogService } from '../../common/services/log.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SharedService } from '../../common/services/shared.service';

import { NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { AppComponent } from '../../app.component';
import { TableColumn } from '../../common/models/interfaces';
import {
  PluginMetaInfo,
  PluginsConfig,
  PluginSectionConfig,
} from '../../common/models/plugins-config';
import { AddPluginDialogComponent } from './add-plugin-dialog/add-plugin-dialog.component';
import { PluginParameterDialogComponent } from './plugin-parameter-dialog/plugin-parameter-dialog.component';

export interface ConfiguredPlugin {
  confname: string;
  instance: string;
  plugin: string;
  desc: string;
  loaded: boolean;
  /** Only meaningful when loaded is true (mirrors SmartPlugin.alive). Purely
   *  informational here - start/stop control lives on the /plugins page. */
  running: boolean;
  enabled: string;
  type?: string;
}

/** Selection for the confirm-delete dialog's follow-up-action dropdown. */
type DeleteFollowupAction = 'keep' | 'stop' | 'unload';

/** Runtime start/stop lives on the /plugins page - this page only ever
 *  drives the lifecycle actions. */
type PluginLifecycleAction = 'load' | 'unload' | 'reload';

@Component({
  selector: 'app-config',
  templateUrl: './plugin-config.component.html',
  styleUrls: ['./plugin-config.component.css'],
  providers: [AppComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ProgressSpinner,
    ButtonDirective,
    NgOptimizedImage,
    FaIconComponent,
    Dialog,
    PrimeTemplate,
    FormsModule,
    InputText,
    Select,
    TranslatePipe,
    AddPluginDialogComponent,
    PluginParameterDialogComponent,
  ],
})
export class PluginConfigComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private pluginsdataService = inject(PluginsApiService);
  private translate = inject(TranslateService);
  private readonly messageService = inject(MessageService);
  private shared = inject(SharedService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  faPlus = faPlus;
  faPlusCircle = faPlusCircle;
  faPlusSquare = faPlusSquare;
  faExclamationTriangle = faExclamationTriangle; // signal deprecated plugin
  faCode = faLaptopCode; // signal plugin in state "develop"
  faCircle = faCircle; // status dot: disabled/running/stopped

  private readonly rawConfiguredplugins = signal<ConfiguredPlugin[]>([]);
  cols!: TableColumn[];

  /** AppConfigService.developerMode is only populated once getServerinfo()
   *  resolves (can race a deep-linked navigation here) - a signal off
   *  config$ keeps the dev-only controls reactive under OnPush. */
  readonly developerMode = toSignal(
    inject(AppConfigService).config$.pipe(map((cfg) => cfg.developerMode)),
    { initialValue: false },
  );

  readonly sortField = signal('');
  readonly sortOrder = signal<1 | -1>(1);

  /** Column-sorted view - pure computed over a copy. */
  readonly configuredplugins = computed(() => {
    const list = this.rawConfiguredplugins();
    const field = this.sortField();
    if (!field) {
      return list;
    }
    const ord = this.sortOrder();
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
  });

  /** Feeds the add-plugin dialog's set-config-name uniqueness check. */
  readonly configuredConfnames = computed(() => this.rawConfiguredplugins().map((p) => p.confname));

  sortBy(field: string): void {
    this.sortOrder.set(this.sortField() === field ? (this.sortOrder() === 1 ? -1 : 1) : 1);
    this.sortField.set(field);
  }

  readonly filterText = signal('');

  onFilterChange(value: string): void {
    this.filterText.set(value);
  }

  clearFilter(): void {
    this.filterText.set('');
  }

  readonly filteredPlugins = computed<ConfiguredPlugin[]>(() => {
    const f = this.filterText().toLowerCase();
    if (!f) return this.configuredplugins();
    return this.configuredplugins().filter(
      (p) =>
        p.confname.toLowerCase().includes(f) ||
        p.plugin.toLowerCase().includes(f) ||
        p.instance.toLowerCase().includes(f) ||
        p.desc.toLowerCase().includes(f),
    );
  });
  pluginconflist!: PluginsConfig;

  // display modal edit dialog
  rowclicked_foredit: ConfiguredPlugin | false = false;

  // for list of installed plugins dialog
  readonly dialog_display = signal(false);
  dialog_readonly = false;
  dialog_configname!: string;
  dialog_pluginname!: string;
  dialog_meta?: PluginMetaInfo;
  dialog_currentConfig?: PluginSectionConfig;
  /** Other confnames configuring the same plugin_name, for the dialog's
   *  copy-from dropdown. Computed unconditionally on every open - this is a
   *  rare, manually-triggered action, so an O(n) scan over the already-
   *  in-memory config list isn't worth guarding behind extra conditions. */
  dialog_siblingConfigs: { confname: string; config: PluginSectionConfig }[] = [];

  // for add dialog
  readonly add_display = signal(false);
  readonly spinner_display = signal(false);
  readonly spinner_header = signal('');

  // confirm delete dialog
  confirmdelete_display = false;
  delete_param!: {};
  readonly deleteAction = signal<DeleteFollowupAction>('unload');

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    this.spinner_display.set(true);
    this.spinner_header.set(this.translate.instant('PLUGIN.LOADCONFIG'));

    this.shared.setGuiLanguage();
    this.setTitle(this.translate.instant('PLUGIN.PLUGIN_CONFIGURATION'));
    this.reloadPluginList();

    this.cols = [
      { field: 'enabled', sfield: '', header: '' },
      { field: 'type', sfield: '', header: '' },
      { field: 'confname', sfield: 'confname', header: 'PLUGIN.CONFIGNAME' },
      { field: 'plugin', sfield: 'plugin', header: 'PLUGIN.PLUGINNAME', min_width: '200px' },
      { field: 'instance', sfield: 'instance', header: 'PLUGIN.INSTANCE', min_width: '120px' },
      { field: 'desc', sfield: '', header: 'PLUGIN.DESCRIPTION' },
    ];
  }

  // ---------------------------------------------------------------
  //  Fetch the plugin config from the backend and rebuild the list.
  //
  private reloadPluginList(onComplete?: () => void): void {
    this.pluginsdataService
      .getPluginsConfig()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.spinner_display.set(false);
        }),
      )
      .subscribe((response) => {
        this.pluginconflist = response as PluginsConfig;
        this.buildConfiguredPlugins();
        onComplete?.();
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
          running: !!plugin_config[plg]._running,
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
        const plgdesc = this.shared.getDescription(
          desc as Record<string, string> | null | undefined,
        );
        conf.desc = this.shared.mdLiteToHtml(plgdesc);

        newPlugins.push(conf);
      }
    }
    this.rawConfiguredplugins.set(newPlugins);
  }

  // ---------------------------------------------------------
  // Handle the click event on the list of installed plugins
  //
  //  - Capture which plugin was clicked and feed its raw config/meta
  //    down to <app-plugin-parameter-dialog>, which builds the actual
  //    parameter table reactively from those inputs.
  //
  rowClicked(event: unknown, rowdata: ConfiguredPlugin) {
    this.dialog_configname = rowdata.confname;
    this.dialog_pluginname = rowdata.plugin.slice(1);
    this.rowclicked_foredit = rowdata;

    const pconf = this.pluginconflist.plugin_config as Record<string, PluginSectionConfig>;
    const conf = pconf[rowdata.confname];
    this.dialog_meta = conf._meta;
    this.dialog_currentConfig = conf;
    this.dialog_siblingConfigs = this.buildSiblingConfigs(rowdata.confname, conf);
    this.dialog_readonly = this.pluginconflist.readonly;

    this.dialog_display.set(true);
  }

  /** Other sections sharing the same plugin identity (plugin_name, falling
   *  back to class_path for classic plugins - same fallback already used
   *  above for the row's display name). */
  private buildSiblingConfigs(
    confname: string,
    conf: PluginSectionConfig,
  ): { confname: string; config: PluginSectionConfig }[] {
    const identity = conf.plugin_name ?? conf.class_path;
    if (!identity) {
      return [];
    }
    const pconf = this.pluginconflist.plugin_config as Record<string, PluginSectionConfig>;
    const siblings: { confname: string; config: PluginSectionConfig }[] = [];
    for (const otherConfname in pconf) {
      const other = pconf[otherConfname];
      if (otherConfname !== confname && (other.plugin_name ?? other.class_path) === identity) {
        siblings.push({ confname: otherConfname, config: other });
      }
    }
    return siblings;
  }

  onParameterDialogSaved(result: { confname: string; enabled: string; instance: string }): void {
    if (this.rowclicked_foredit) {
      this.rowclicked_foredit.enabled = result.enabled;
      this.rowclicked_foredit.instance = result.instance;
    }
  }

  private _runLifecycleAction(configname: string, action: PluginLifecycleAction): void {
    const spinnerKey: Record<PluginLifecycleAction, string> = {
      load: 'PLUGIN.LOADING',
      unload: 'PLUGIN.UNLOADING',
      reload: 'PLUGIN.RELOADING',
    };
    const successKey: Record<PluginLifecycleAction, string> = {
      load: 'PLUGIN.LOADED',
      unload: 'PLUGIN.UNLOADED',
      reload: 'PLUGIN.RELOADED',
    };
    const errorKey: Record<PluginLifecycleAction, string> = {
      load: 'PLUGIN.LOAD_FAILED',
      unload: 'PLUGIN.UNLOAD_FAILED',
      reload: 'PLUGIN.RELOAD_FAILED',
    };

    this.spinner_display.set(true);
    this.spinner_header.set(this.translate.instant(spinnerKey[action]));

    this.pluginsdataService
      .setPluginState(configname, action)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.spinner_display.set(false);
        }),
      )
      .subscribe((result) => {
        if (result === true) {
          this.reloadPluginList();
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant(successKey[action]),
            detail: configname,
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant(errorKey[action]),
            detail: configname,
            sticky: true,
          });
        }
      });
  }

  loadPlugin(row: ConfiguredPlugin): void {
    // load_plugin() silently no-ops for a disabled plugin server-side (by
    // design - see lib/plugin.py) and returns the same generic failure as
    // any other load error. Catch it here, where the disabled state is
    // already known, rather than showing a misleading "check the
    // parameters" message for something that was never about parameters.
    if (row.enabled === 'false') {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('PLUGIN.LOAD_DISABLED'),
        detail: row.confname,
        sticky: true,
      });
      return;
    }
    this._runLifecycleAction(row.confname, 'load');
  }

  unloadPlugin(confname: string): void {
    this._runLifecycleAction(confname, 'unload');
  }

  reloadPlugin(confname: string): void {
    this._runLifecycleAction(confname, 'reload');
  }

  // -------------------------------------------------------------------
  //  Add configuration
  //
  onPluginAdded(confname: string): void {
    this.log.log('PluginConfigComponent.onPluginAdded:', confname);
    this.spinner_display.set(true);
    this.spinner_header.set(this.translate.instant('PLUGIN.LOADCONFIG'));
    this.reloadPluginList(() => this.openForConfigurationIfNeeded(confname));
  }

  /** A freshly added plugin is never loadable until its mandatory
   *  parameters are filled in - open the parameter dialog for it
   *  automatically, but only when there's actually something required to
   *  fill in (many plugins need no configuration at all). */
  private openForConfigurationIfNeeded(confname: string): void {
    const pconf = this.pluginconflist.plugin_config as Record<string, PluginSectionConfig>;
    const meta = pconf[confname]?._meta;
    const hasMandatoryParams = Object.values(meta?.parameters ?? {}).some((p) => p.mandatory);
    if (!hasMandatoryParams) {
      return;
    }
    const row = this.configuredplugins().find((p) => p.confname === confname);
    if (row) {
      this.rowClicked(null, row);
    }
  }

  // -------------------------------------------------------------------
  //  Delete configuration
  //
  /** Nothing to choose between when the plugin isn't loaded - "stop"/"unload"
   *  both act on a live process, "keep" would be the only remaining
   *  (and only meaningful) option, so the whole dropdown is redundant. */
  get showDeleteActionDropdown(): boolean {
    return !!this.rowclicked_foredit && this.rowclicked_foredit.loaded;
  }

  get deleteActionOptions(): { label: string; value: DeleteFollowupAction }[] {
    // Only reached when loaded is true (the dropdown itself is hidden
    // otherwise) - "keep running" would be wrong for a loaded-but-stopped
    // plugin, since nothing is actually running to "keep".
    const keepLabel =
      this.rowclicked_foredit && this.rowclicked_foredit.running
        ? 'PLUGIN.DELETE_KEEP_RUNNING'
        : 'PLUGIN.DELETE_KEEP_LOADED';
    const options: { label: string; value: DeleteFollowupAction }[] = [
      { label: this.translate.instant(keepLabel), value: 'keep' },
    ];
    if (this.rowclicked_foredit && this.rowclicked_foredit.running) {
      options.push({ label: this.translate.instant('PLUGIN.DELETE_STOP_FIRST'), value: 'stop' });
    }
    if (this.rowclicked_foredit && this.rowclicked_foredit.loaded) {
      options.push({
        label: this.translate.instant('PLUGIN.DELETE_UNLOAD_FIRST'),
        value: 'unload',
      });
    }
    return options;
  }

  /** Delete straight from the row, without going through the parameter
   *  dialog first - DeleteConfig()/DeleteConfigConfirm() only ever read
   *  dialog_configname/rowclicked_foredit, so setting those directly here
   *  and delegating is all that's needed; nothing about them is specific
   *  to having gone through rowClicked() first. */
  deleteConfigFromRow(row: ConfiguredPlugin): void {
    this.dialog_configname = row.confname;
    this.rowclicked_foredit = row;
    this.DeleteConfig();
  }

  DeleteConfig() {
    this.log.log('PluginConfigComponent.DeleteConfig:');
    this.log.warn(this.dialog_configname);

    this.delete_param = { config: this.dialog_configname };
    this.deleteAction.set(
      this.rowclicked_foredit && this.rowclicked_foredit.loaded ? 'unload' : 'keep',
    );

    this.confirmdelete_display = true;
  }

  DeleteConfigConfirm() {
    this.confirmdelete_display = false;

    const configname = this.dialog_configname;
    const delete$ = this.pluginsdataService
      .deletePluginConfig(configname)
      .pipe(takeUntilDestroyed(this.destroyRef));

    const choice = this.deleteAction();
    const action$ =
      choice === 'keep'
        ? delete$
        : this.pluginsdataService.setPluginState(configname, choice).pipe(
            takeUntilDestroyed(this.destroyRef),
            switchMap(() => delete$),
          );

    action$.subscribe((response) => {
      if (response) {
        this.dialog_display.set(false);
        this.spinner_display.set(true);
        this.spinner_header.set(this.translate.instant('PLUGIN.LOADCONFIG'));
        this.reloadPluginList();
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
