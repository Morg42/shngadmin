import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { CompletionContext } from '@codemirror/autocomplete';
import { KeyBinding } from '@codemirror/view';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Ripple } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { Tab as Tab_1, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import {
  CmCompletionSource,
  CodeEditorComponent,
} from '../../common/components/code-editor/code-editor.component';
import { DynamicFieldComponent } from '../../common/components/dynamic-field/dynamic-field.component';
import { ConfigParameter, TableColumn } from '../../common/models/interfaces';
import { LogicsGroupType, LogicsinfoType } from '../../common/models/logics-info';
import { LogicsWatchItem } from '../../common/models/logics-watch-item';
import { FilesApiService } from '../../common/services/files-api.service';
import { ItemsApiService } from '../../common/services/items-api.service';
import { LogService } from '../../common/services/log.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SharedService } from '../../common/services/shared.service';

@Component({
  selector: 'app-logics-edit',
  templateUrl: './logics-edit.component.html',
  styleUrls: ['./logics-edit.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AutoComplete,
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab_1,
    TabPanels,
    TabPanel,
    ButtonDirective,
    CodeEditorComponent,
    FormsModule,
    InputText,
    NgStyle,
    Message,
    TableModule,
    PrimeTemplate,
    DynamicFieldComponent,
    Dialog,
    TranslatePipe,
  ],
})
export class LogicsEditComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(LogicsApiService);
  private fileService = inject(FilesApiService);
  private pluginsapiService = inject(PluginsApiService);
  private shared = inject(SharedService);
  private itemsapiService = inject(ItemsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  readonly logic = signal<LogicsinfoType>({} as LogicsinfoType);

  // Group autocomplete
  readonly logicGroupChips = signal<string[]>([]); // array binding for p-autoComplete
  readonly allGroupNames = signal<string[]>([]); // all defined group names (for suggestions)
  filteredGroupNames: string[] = []; // current suggestion dropdown list
  // Written from CodeMirror keybindings (not template-bound events), so these
  // must be signals - nothing else would mark the OnPush component dirty.
  readonly wrongWatchItem = signal(false);
  readonly logicChanged = signal(false);
  logicDescriptionOrig: string | undefined;
  logicGroupOrig!: string | string[] | null;
  logicCycleOrig!: string | null;
  logicCrontabOrig!: string | string[] | null;
  logicWatchitemOrig!: LogicsWatchItem[];

  readonly parameters = signal<ConfigParameter[]>([]);
  readonly parameter_cols = signal<TableColumn[]>([]);
  pluginParameters: Record<string, Record<string, unknown>> = {};

  readonly codeEditor = viewChild<CodeEditorComponent>('codeeditor');
  readonly codeEditorWatchItems = viewChild<CodeEditorComponent>('watchitems');
  readonly groupAutoComplete = viewChild<AutoComplete>('groupAC');

  readonly myEditFilename = signal('');
  myLogicName!: string;
  readonly myLogicIsLoaded = signal(false);
  autocomplete_list: { text: string; displayText: string }[] = [];
  full_autocomplete_list: { text: string; displayText: string }[] = [];
  valid_item_list: string[] = [];
  readonly myTextarea = signal('');
  readonly myTextareaOrig = signal('');
  readonly myTextareaWatchItems = signal('');

  mainCompletionSource: CmCompletionSource = () => null;
  watchItemCompletionSource: CmCompletionSource = () => null;

  readonly watchItemAllowedPattern = /^[a-z0-9._-]+$/i;
  readonly watchItemExtraKeys: KeyBinding[] = [
    {
      key: 'Enter',
      run: () => {
        this.addItem();
        return true;
      },
    },
  ];
  readonly editorExtraKeys: KeyBinding[] = [
    {
      key: 'F1',
      run: () => {
        this.editorHelp_display.set(true);
        return true;
      },
    },
  ];

  readonly editorHelp_display = signal(false);
  parameterHelp_display = false;

  readonly rename_display = signal(false);
  rename_newLogicName = '';
  rename_newFilename = '';

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    const logic = (this.route.snapshot.paramMap.get('logicname') ?? '').split('|');
    if (logic.length === 1) {
      logic.push('');
    }
    this.myEditFilename.set(logic[1].trim());
    this.myLogicName = logic[0].trim();
    this.log.log('LogicsEditComponent.ngOnInit()', { logic });

    this.wrongWatchItem.set(false);
    this.logicChanged.set(false);

    // Build completion sources once — they close over the mutable arrays,
    // so completions appear as soon as subscriptions populate the lists.
    this.mainCompletionSource = this._makeCompletionSource(this.autocomplete_list);
    this.watchItemCompletionSource = this._makeCompletionSource(this.full_autocomplete_list);

    this.getLogicInfo(this.myLogicName);

    // Fetch group names for the autocomplete suggestion list
    this.dataService
      .getGroupsInfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const groups = (response as { groups: Record<string, LogicsGroupType> })['groups'] ?? {};
        this.allGroupNames.set(
          Object.keys(groups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        );
      });

    this.setTitle(this.translate.instant('LOGICS.LOGIC') + ' ' + this.myLogicName);

    this.pluginsapiService
      .getPluginsAPI()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        const result = response2 as string[];
        for (let i = 0; i < result.length; i++) {
          this.autocomplete_list.push({
            text: 'sh.' + result[i],
            displayText: 'sh.' + result[i] + ' | Plugin',
          });
        }
      });

    this.itemsapiService
      .getItemList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const result = response as string[];
        for (let i = 0; i < result.length; i++) {
          this.full_autocomplete_list.push({ text: result[i], displayText: result[i] });
          this.full_autocomplete_list.push({ text: result[i], displayText: 'sh.' + result[i] });
          this.valid_item_list.push(result[i]);
          this.autocomplete_list.push({
            text: 'sh.' + result[i] + '()',
            displayText: 'sh.' + result[i] + '() | Item',
          });
        }
      });
  }

  getPluginParameterDefinitions() {
    // this.log.warn('getPluginParameterDefinitions', this.logic);
    this.parameter_cols.set([
      {
        field: 'name',
        sfield: 'confname',
        header: 'PLUGIN.PARAMETER',
        width: '150px',
        iwidth: '146px',
      },
      {
        field: 'value',
        sfield: 'paramvalue',
        header: 'PLUGIN.VALUE',
        width: '200px',
        iwidth: '196px',
      },
      { field: 'type', sfield: 'conftype', header: 'PLUGIN.TYPE', width: '100px', iwidth: '96px' },
      { field: 'desc', sfield: '', header: 'PLUGIN.DESCRIPTION', width: '', iwidth: '' },
    ]);

    this.pluginsapiService
      .getPluginsLogicParameters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.pluginParameters = response as Record<string, Record<string, unknown>>;
        // this.log.log('ngOnInit: pluginParameters', this.pluginParameters);

        const parameters: ConfigParameter[] = [];
        for (const param in this.pluginParameters) {
          if (param in this.pluginParameters) {
            const paramdef = this.pluginParameters[param];

            const vl: { label: string; value: unknown }[] = [];
            const validList = paramdef['valid_list'] as unknown[];
            if (validList !== undefined) {
              for (let i = 0; i < validList.length; i++) {
                const wrk = { label: String(validList[i]), value: validList[i] };
                vl.push(wrk);
              }
            }

            // generate a valid_list for bool parameters
            if (paramdef['type'] === 'bool') {
              if (vl.length === 0) {
                vl.push({ label: 'true', value: true });
                vl.push({ label: 'false', value: false });
              }
            }

            // fill description with active language
            const paramdesc = this.shared.getDescription(
              paramdef['description'] as Record<string, string>,
            );

            let val: unknown = null;
            val = (this.logic() as unknown as Record<string, unknown>)[param];
            // this.log.log({param}, {val});
            if (val === undefined || val === null) {
              val = null;
            }
            if (paramdef['type'] === 'list') {
              val = this.shared.listToString(val as string | string[] | null | undefined);
            }

            const paramdata: ConfigParameter = {
              name: param,
              type: paramdef['type'] as string,
              valid_list: vl,
              valid_min: paramdef['valid_min'],
              valid_max: paramdef['valid_max'],
              default: paramdef['default'],
              mandatory: paramdef['mandatory'],
              value: val,
              value_orig: val,
              desc: paramdesc,
            };

            if (paramdata['type'] === 'list') {
              // this.log.log({paramdef});
              if (paramdef['default'] !== undefined) {
                paramdata['default'] = this.shared.listToString(
                  paramdef['default'] as string | string[] | undefined,
                );
              }
            }
            if (paramdef['hide'] && ['str', 'int'].indexOf(paramdef['type'] as string) !== -1) {
              paramdata['type'] = 'hide' + '-' + (paramdef['type'] as string);
            }

            if (paramdata.type === 'bool') {
              if (val === undefined) {
                paramdata.value = null;
              } else if (typeof val === 'boolean') {
                paramdata.value = val;
              } else {
                if (val === null) {
                  paramdata.value = null;
                } else {
                  paramdata.value = String(val).toLowerCase() === 'true';
                }
              }
            } else if (paramdata.type === 'list') {
              paramdata.value = this.shared.listToString(val as string);
            } else {
              paramdata.value = val as string;
            }

            // add to the table of configured plugins
            parameters.push(paramdata);
          }
        }
        this.parameters.set(parameters);
      });
  }

  /** Called by p-autoComplete (completeMethod) to filter suggestions. */
  searchGroups(event: { query: string }) {
    const q = event.query.toLowerCase();
    // Suggest existing groups that match the query and aren't already selected
    this.filteredGroupNames = this.allGroupNames().filter(
      (g) => g.toLowerCase().includes(q) && !this.logicGroupChips().includes(g),
    );
  }

  /** Open the suggestions dropdown automatically when the field receives focus. */
  onGroupFocus() {
    this.filteredGroupNames = this.allGroupNames().filter(
      (g) => !this.logicGroupChips().includes(g),
    );
    if (this.filteredGroupNames.length > 0) {
      this.groupAutoComplete()?.show();
    }
  }

  /** Called whenever the chip list changes (add/remove/select). Syncs logic.group string. */
  onGroupChipsChange() {
    this.logic.update((l) => ({
      ...l,
      group: this.shared.listToString(this.logicGroupChips()) ?? '',
    }));
    this.logicChanged.set(this.hasLogicChanged());
  }

  getLogicInfo(logicname: string) {
    // this.log.warn({logicname});
    this.dataService
      .getLogic(logicname)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const logic = response as LogicsinfoType;
        // this.log.warn('LogicsEditComponent.getLogicInfo() logic', logic);

        if (logic.enabled === undefined) {
          logic.enabled = true;
        }

        if (logic.logic_description === undefined) {
          logic.logic_description = '';
        }
        if (logic.group === undefined) {
          logic.group = '';
        }
        logic.group = this.shared.listToString(logic.group);
        // Populate chip array from the pipe-separated string
        this.logicGroupChips.set(this.shared.stringToList(logic.group as string | null));

        if (logic.cycle === undefined) {
          logic.cycle = null;
        }
        if (logic.crontab === undefined) {
          logic.crontab = '';
        }
        logic.crontab = this.shared.listToString(logic.crontab);

        if (logic.watch_item === undefined) {
          logic.watch_item = [];
        }
        this.logic.set(logic);

        if (this.myEditFilename() === '') {
          if (logic.filename !== null && logic.filename !== undefined && logic.filename !== '') {
            this.myEditFilename.set(logic.filename);
          }
        }

        this.fileService
          .readFile('logics', this.myEditFilename())
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (responseFile) => {
              this.myTextarea.set(responseFile);
              this.myTextareaOrig.set(responseFile);
            },
            error: () => {
              // error already logged by the service
            },
          });

        this.getPluginParameterDefinitions();

        this.logicDescriptionOrig = logic.logic_description;
        this.logicGroupOrig = logic.group ?? null;
        this.logicCycleOrig = logic.cycle;
        this.logicCrontabOrig = logic.crontab ?? null;
        this.logicWatchitemOrig = Array.from(logic.watch_item);
      });

    this.dataService
      .getLogicState(logicname)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp = response as Record<string, unknown>;
        if (resp['watch_item'] !== undefined) {
          // assign only if valid data is returned (do not assigen in localhost test mode)
          this.logic.set(response as LogicsinfoType);
        }
        this.myLogicIsLoaded.set(resp['is_loaded'] as boolean);
      });
  }

  hasLogicChanged() {
    if (this.codeChanged()) {
      return true;
    }
    if (this.parametersChanged()) {
      return true;
    }
    return false;
  }

  codeChanged() {
    if (this.myTextarea() !== this.myTextareaOrig()) {
      return true;
    }
    return false;
  }

  parametersChanged() {
    const logic = this.logic();
    if (logic.cycle !== this.logicCycleOrig) {
      if (!(logic.cycle === null && this.logicCycleOrig === '')) {
        return true;
      }
    }
    if (logic.logic_description !== this.logicDescriptionOrig) {
      if (!(logic.logic_description === null && this.logicDescriptionOrig === '')) {
        return true;
      }
    }
    if (logic.group !== this.logicGroupOrig) {
      if (!(logic.group === null && this.logicGroupOrig === '')) {
        return true;
      }
    }
    if (logic.crontab !== this.logicCrontabOrig) {
      if (!(logic.crontab === null && this.logicCrontabOrig === '')) {
        return true;
      }
    }

    for (const param of this.parameters()) {
      if (param.value !== param.value_orig) {
        return true;
      }
    }

    if (typeof logic.watch_item !== 'undefined') {
      let allIdenticalFlag = true;
      for (const watchItemOrig of this.logicWatchitemOrig) {
        if (!logic.watch_item.includes(watchItemOrig)) {
          this.log.log('parametersChanged', { watchItemOrig });
          allIdenticalFlag = false;
        }
      }
      if (logic.watch_item.length !== this.logicWatchitemOrig.length) {
        allIdenticalFlag = false;
      }
      return !allIdenticalFlag;
    }

    return false;
  }

  private _makeCompletionSource(
    curDict: { text: string; displayText: string }[],
  ): CmCompletionSource {
    return (context: CompletionContext) => {
      const word = context.matchBefore(/[\w.$]+/);
      if (!word || word.text.trim().length < 3) return null;
      const curWord = word.text.trim();
      const regex = new RegExp('^' + curWord, 'i');
      const options = curDict
        .filter((item) => item.displayText.match(regex))
        .sort((a, b) => (a.text.toLowerCase() < b.text.toLowerCase() ? -1 : 1))
        .map((item) => ({ label: item.displayText, apply: item.text }));
      if (options.length === 0) return null;
      return { from: word.from, to: word.to, options, filter: false };
    };
  }

  removeItem(item: LogicsWatchItem) {
    const index = this.logic().watch_item.indexOf(item);
    if (index > -1) {
      this.logic.update((l) => ({
        ...l,
        watch_item: l.watch_item.filter((w) => w !== item),
      }));
      this.logicChanged.set(this.hasLogicChanged());
    }
    return;
  }

  checkItemWithValidItems() {
    for (const i of this.valid_item_list) {
      if (i === this.myTextareaWatchItems()) {
        // check if item is already in watch item list
        for (const j of this.logic().watch_item) {
          if (String(j) === this.myTextareaWatchItems()) {
            return false;
          }
        }
        return true;
      }
    }
    return false;
  }

  addItem() {
    // check if item is from overall item list and not in watch item list
    // the loop also regards items with a path that starts with "sh." (itemname sh!)
    if (!this.checkItemWithValidItems()) {
      if (this.myTextareaWatchItems().startsWith('sh.')) {
        this.myTextareaWatchItems.set(this.myTextareaWatchItems().slice(3));
        if (!this.checkItemWithValidItems()) {
          this.wrongWatchItem.set(true);
          return;
        }
      } else {
        this.wrongWatchItem.set(true);
        return;
      }
    }
    const newItem = this.myTextareaWatchItems() as unknown as LogicsWatchItem;
    this.logic.update((l) => ({ ...l, watch_item: [...l.watch_item, newItem] }));
    this.myTextareaWatchItems.set('');
    this.wrongWatchItem.set(false);
    this.logicChanged.set(this.hasLogicChanged());
    return;
  }

  saveCode(reload = false) {
    // this.log.log('LoggingConfigurationComponent.saveCode');
    this.fileService
      .saveFile('logics', this.myEditFilename(), this.myTextarea())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // after saving the code, set Orig var to signal the editor shows "unchanged code"
        this.myTextareaOrig.set(this.myTextarea());
        this.logicChanged.set(this.hasLogicChanged());
        if (reload) {
          this.loadLogic(this.logic().name); // reloadLogic
        }
      });
  }

  discardChanges() {
    this.myTextarea.set(this.myTextareaOrig());
    this.logic.update((l) => ({
      ...l,
      logic_description: this.logicDescriptionOrig,
      group: this.logicGroupOrig,
      cycle: this.logicCycleOrig,
      crontab: this.logicCrontabOrig,
      watch_item: Array.from(this.logicWatchitemOrig),
    }));
    this.logicGroupChips.set(
      this.shared.stringToList(
        Array.isArray(this.logicGroupOrig)
          ? this.logicGroupOrig.join(' | ')
          : (this.logicGroupOrig as string | null),
      ),
    );
    this.parameters.update((params) => params.map((p) => ({ ...p, value: p.value_orig })));

    this.logicChanged.set(this.hasLogicChanged());
  }

  saveParameters(reload: boolean) {
    // this.log.log('LoggingConfigurationComponent.saveParameters');

    const params: Record<string, unknown> = {};

    const logic = this.logic();
    const cycle = !(parseInt(logic.cycle ?? '', 10) > 0) ? null : logic.cycle;
    params['logic_description'] = logic.logic_description;
    params['group'] = this.shared.stringToList(
      Array.isArray(logic.group) ? logic.group.join(' | ') : (logic.group ?? null),
    );
    params['cycle'] = cycle;
    params['crontab'] = this.shared.stringToList(
      Array.isArray(logic.crontab) ? logic.crontab.join(' | ') : logic.crontab,
    );
    this.logic.update((l) => ({
      ...l,
      cycle,
      group: this.shared.listToString(params['group'] as string[]),
      crontab: this.shared.listToString(params['crontab'] as string[]),
    }));

    params['watch_item'] = logic.watch_item;
    this.logicWatchitemOrig = Array.from(logic.watch_item);

    for (const param in this.pluginParameters) {
      if (param in this.pluginParameters) {
        params[param] = null;
      }
    }
    this.parameters.update((paramList) =>
      paramList.map((parameter) => {
        if (!(parameter.name in this.pluginParameters)) {
          return parameter;
        }
        let value = parameter.value;
        if (parameter.type === 'list') {
          params[parameter.name] = this.shared.stringToList(parameter.value as string | null);
          value = this.shared.listToString(params[parameter.name] as string | null);
        } else {
          params[parameter.name] = parameter.value;
        }
        return { ...parameter, value, value_orig: value };
      }),
    );

    this.dataService
      .saveLogicParameters(this.myLogicName, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // after saving the parameters, set Orig vars to signal the editor shows "unchanged values"
        this.logicDescriptionOrig = this.logic().logic_description;
        this.logicGroupOrig = this.logic().group ?? null;
        this.logicCycleOrig = this.logic().cycle;
        this.logicCrontabOrig = this.logic().crontab ?? null;

        this.logicChanged.set(this.hasLogicChanged());

        if (reload) {
          this.loadLogic(this.logic().name); // reloadLogic
        }
      });
  }

  saveLogic(reload = false) {
    if (this.codeChanged()) {
      if (this.parametersChanged()) {
        this.saveCode();
      } else {
        this.saveCode(reload);
      }
    }
    if (this.parametersChanged()) {
      this.saveParameters(reload);
    }
  }

  triggerLogic() {
    // this.log.log('triggerLogic', {logicName});
    this.dataService
      .setLogicState(this.logic().name, 'trigger')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        // this.getLogics();
      });
  }

  reloadLogic(logicName: string) {
    this.log.log('reloadLogic', { logicName });

    if (logicName === undefined) {
      logicName = this.myLogicName;
    }
    this.dataService
      .setLogicState(logicName, 'reload')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myLogicIsLoaded.set(response !== false);
      });
  }

  loadLogic(logicName: string) {
    this.log.log('loadLogic', { logicName });
    // this.log.warn('myLogicName', this.myLogicName, 'myEditFilename', this.myEditFilename);

    if (logicName === undefined) {
      logicName = this.myLogicName;
    }
    this.dataService
      .setLogicState(logicName, 'load')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myLogicIsLoaded.set(response !== false);
      });
  }

  disableLogic(logicName: string) {
    // this.log.log('disableLogic', {logicName});
    this.dataService
      .setLogicState(logicName, 'disable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.logic.update((l) => ({ ...l, enabled: false }));
      });
  }

  enableLogic(logicName: string) {
    // this.log.log('enableLogic', {logicName});
    this.dataService
      .setLogicState(logicName, 'enable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.logic.update((l) => ({ ...l, enabled: true }));
      });
  }

  openRenameDialog() {
    // Pre-fill with current values
    this.rename_newLogicName = this.myLogicName;
    // strip .py suffix for the filename field
    this.rename_newFilename = this.myEditFilename().endsWith('.py')
      ? this.myEditFilename().slice(0, -3)
      : this.myEditFilename();
    this.rename_display.set(true);
  }

  get renameEnabled(): boolean {
    const nameChanged = this.rename_newLogicName.trim() !== this.myLogicName;
    const fileChanged =
      this.rename_newFilename.trim() !==
      (this.myEditFilename().endsWith('.py')
        ? this.myEditFilename().slice(0, -3)
        : this.myEditFilename());
    return (
      this.rename_newLogicName.trim() !== '' &&
      this.rename_newFilename.trim() !== '' &&
      (nameChanged || fileChanged)
    );
  }

  /** True when the filename field changed but only in case — the backend will normalise it to the same lowercase value. */
  get filenameChangeIsNoop(): boolean {
    const currentFileStem = this.myEditFilename().endsWith('.py')
      ? this.myEditFilename().slice(0, -3)
      : this.myEditFilename();
    const newFile = this.rename_newFilename.trim();
    return newFile !== currentFileStem && newFile.toLowerCase() === currentFileStem.toLowerCase();
  }

  doRename() {
    const newName = this.rename_newLogicName.trim();
    const newFile = this.rename_newFilename.trim();
    const oldName = this.myLogicName;

    // Only pass newFile to backend if it actually changed
    const currentFileStem = this.myEditFilename().endsWith('.py')
      ? this.myEditFilename().slice(0, -3)
      : this.myEditFilename();
    const newFilenameArg = newFile !== currentFileStem ? newFile : '';

    this.dataService
      .renameLogic(oldName, newName, newFilenameArg)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === true) {
          this.rename_display.set(false);
          const newFilename = newFilenameArg !== '' ? newFile + '.py' : this.myEditFilename();
          this.router.navigate(['/logics/edit', `${newName}|${newFilename}`]);
        }
      });
  }
}
