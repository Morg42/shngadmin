import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CompletionContext } from '@codemirror/autocomplete';
import { KeyBinding } from '@codemirror/view';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
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
import { LogicsinfoType } from '../../common/models/logics-info';
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
  private readonly cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private dataService = inject(LogicsApiService);
  private fileService = inject(FilesApiService);
  private pluginsapiService = inject(PluginsApiService);
  private shared = inject(SharedService);
  private itemsapiService = inject(ItemsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  logics!: LogicsinfoType[];
  newlogics!: LogicsinfoType[];
  logic: LogicsinfoType = {} as LogicsinfoType;
  wrongWatchItem!: boolean;
  logicChanged!: boolean;
  logicDescriptionOrig: string | undefined;
  logicGroupOrig!: string | string[] | null;
  logicCycleOrig!: string | null;
  logicCrontabOrig!: string | string[] | null;
  logicWatchitemOrig!: LogicsWatchItem[];

  parameters: ConfigParameter[] = [];
  parameter_cols!: TableColumn[];
  pluginParameters: Record<string, Record<string, unknown>> = {};

  @ViewChild('codeeditor') codeEditor?: CodeEditorComponent;
  @ViewChild('watchitems') codeEditorWatchItems?: CodeEditorComponent;

  myEditFilename!: string;
  myLogicName!: string;
  myLogicIsLoaded = false;
  autocomplete_list: { text: string; displayText: string }[] = [];
  full_autocomplete_list: { text: string; displayText: string }[] = [];
  valid_item_list: string[] = [];
  myTextarea = '';
  myTextareaOrig = '';
  myTextareaWatchItems = '';

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
        this.editorHelp_display = true;
        return true;
      },
    },
  ];

  editorHelp_display = false;
  parameterHelp_display = false;
  error_display = false;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    const logic = (this.route.snapshot.paramMap.get('logicname') ?? '').split('|');
    if (logic.length === 1) {
      logic.push('');
    }
    this.myEditFilename = logic[1].trim();
    this.myLogicName = logic[0].trim();
    this.log.log('LogicsEditComponent.ngOnInit()', { logic });

    this.wrongWatchItem = false;
    this.logicChanged = false;

    // Build completion sources once — they close over the mutable arrays,
    // so completions appear as soon as subscriptions populate the lists.
    this.mainCompletionSource = this._makeCompletionSource(this.autocomplete_list);
    this.watchItemCompletionSource = this._makeCompletionSource(this.full_autocomplete_list);

    this.getLogicInfo(this.myLogicName);

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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      });
  }

  getPluginParameterDefinitions() {
    // this.log.warn('getPluginParameterDefinitions', this.logic);
    this.parameter_cols = [
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
    ];

    this.pluginsapiService
      .getPluginsLogicParameters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.pluginParameters = response as Record<string, Record<string, unknown>>;
        // this.log.log('ngOnInit: pluginParameters', this.pluginParameters);

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
            val = (this.logic as unknown as Record<string, unknown>)[param];
            // this.log.log({param}, {val});
            if (val === undefined || val === null) {
              val = null;
            }
            if (paramdef['type'] === 'list') {
              val = this.listToString(val as string | string[] | null | undefined);
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
                paramdata['default'] = this.listToString(
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
              paramdata.value = this.listToString(val as string);
            } else {
              paramdata.value = val as string;
            }

            // add to the table of configured plugins
            this.parameters.push(paramdata);
          }
        }
        this.cdr.markForCheck();
      });
  }

  listToString(list: string | string[] | null | undefined): string | null {
    let result: string | null = '';
    if (list === null) {
      result = null;
    } else if (typeof list === 'string') {
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

  stringToList(str: string | null) {
    // let wrk = str.trim();
    // wrk =  wrk.replace(/,/g, ' ');   // comma is no delimiter
    // wrk =  wrk.replace(/\|/g, ' ');
    // wrk =  wrk.replace(/   /g, ' ');
    // while (wrk.indexOf('  ') !== -1) {
    //   wrk =  wrk.replace(/  /g, ' ');
    // }
    if (str === null) {
      return [];
    } else if (str.trim() === '') {
      return [];
    }
    const list = str.split('|');
    for (let i = 0; i < list.length; i++) {
      list[i] = list[i].trim();
    }
    return list;
  }

  getLogicInfo(logicname: string) {
    // this.log.warn({logicname});
    this.dataService
      .getLogic(logicname)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.logic = response as LogicsinfoType;
        // this.log.warn('LogicsEditComponent.getLogicInfo() this.logic', this.logic);

        if (this.logic.enabled === undefined) {
          this.logic.enabled = true;
        }

        if (this.logic.logic_description === undefined) {
          this.logic.logic_description = '';
        }
        if (this.logic.group === undefined) {
          this.logic.group = '';
        }
        this.log.log('typeof this.logic.group', typeof this.logic.group, this.logic.group);
        this.logic.group = this.listToString(this.logic.group);
        this.log.log('typeof this.logic.group', typeof this.logic.group, this.logic.group);

        if (this.logic.cycle === undefined) {
          this.logic.cycle = null;
        }
        if (this.logic.crontab === undefined) {
          this.logic.crontab = '';
        }
        // this.log.log('typeof this.logic.crontab', typeof this.logic.crontab, this.logic.crontab);
        this.logic.crontab = this.listToString(this.logic.crontab);
        // this.log.log('typeof this.logic.crontab', typeof this.logic.crontab, this.logic.crontab);

        if (this.myEditFilename === '') {
          if (
            this.logic.filename !== null &&
            this.logic.filename !== undefined &&
            this.logic.filename !== ''
          ) {
            this.myEditFilename = this.logic.filename;
          }
        }

        this.fileService
          .readFile('logics', this.myEditFilename)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((responseFile) => {
            this.myTextarea = responseFile;
            this.myTextareaOrig = this.myTextarea;
            this.cdr.markForCheck();
          });

        this.getPluginParameterDefinitions();
        this.cdr.markForCheck();

        this.logicDescriptionOrig = this.logic.logic_description;
        this.logicGroupOrig = this.logic.group ?? null;
        this.logicCycleOrig = this.logic.cycle;
        this.logicCrontabOrig = this.logic.crontab ?? null;
        this.logicWatchitemOrig = [];
        if (this.logic.watch_item !== undefined) {
          if (typeof this.logic.watch_item === 'string') {
            this.logicWatchitemOrig = Array.from(this.logic.watch_item);
          } else {
            this.logicWatchitemOrig = Array.from(this.logic.watch_item);
            // this.log.log('this.logic.watch_item', this.logic.watch_item);
          }
        } else {
          this.logic.watch_item = [];
          this.logicWatchitemOrig = [];
        }
      });

    this.log.warn('getLogicInfo *3', this.logic);
    this.dataService
      .getLogicState(logicname)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp = response as Record<string, unknown>;
        if (resp['watch_item'] !== undefined) {
          // assign only if valid data is returned (do not assigen in localhost test mode)
          this.logic = response as LogicsinfoType;
        }
        this.log.warn('getLogicInfo *4', this.logic, response);
        this.myLogicIsLoaded = resp['is_loaded'] as boolean;
        // this.log.warn('LogicsEditComponent.getLogicInfo() state isLoaded', response['is_loaded']);
        this.cdr.markForCheck();
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
    if (this.myTextarea !== this.myTextareaOrig) {
      return true;
    }
    return false;
  }

  parametersChanged() {
    if (this.logic.cycle !== this.logicCycleOrig) {
      if (!(this.logic.cycle === null && this.logicCycleOrig === '')) {
        // this.log.log('parametersChanged:', 'cycle', this.logic.cycle, ':' + this.logicCycleOrig + ':');
        return true;
      }
    }
    if (this.logic.logic_description !== this.logicDescriptionOrig) {
      if (!(this.logic.logic_description === null && this.logicDescriptionOrig === '')) {
        // this.log.log('parametersChanged:', 'logic_description');
        return true;
      }
    }
    if (this.logic.group !== this.logicGroupOrig) {
      if (!(this.logic.group === null && this.logicGroupOrig === '')) {
        // this.log.log('parametersChanged:', 'group');
        return true;
      }
    }
    if (this.logic.crontab !== this.logicCrontabOrig) {
      if (!(this.logic.crontab === null && this.logicCrontabOrig === '')) {
        return true;
      }
    }

    for (let i = 0; i < this.parameters.length; i++) {
      if (this.parameters[i].value !== this.parameters[i].value_orig) {
        // this.log.log('parametersChanged:', this.parameters[i].name, this.parameters[i].value, ':' + this.parameters[i].value_orig + ':');
        return true;
      }
    }

    if (typeof this.logic.watch_item !== 'undefined') {
      // this.log.log(this.logicWatchitemOrig, this.logic.watch_item);
      let allIdenticalFlag = true;
      for (const watchItemOrig of this.logicWatchitemOrig) {
        if (!this.logic.watch_item.includes(watchItemOrig)) {
          this.log.log('parametersChanged', { watchItemOrig });
          allIdenticalFlag = false;
        }
      }
      if (this.logic.watch_item.length !== this.logicWatchitemOrig.length) {
        // this.log.log('parametersChanged', 'length changed');
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
    const index = this.logic.watch_item.indexOf(item);
    if (index > -1) {
      this.logic.watch_item.splice(index, 1);
      this.logicChanged = this.hasLogicChanged();
    }
    return;
  }

  checkItemWithValidItems() {
    for (const i of this.valid_item_list) {
      if (i === this.myTextareaWatchItems) {
        // check if item is already in watch item list
        for (const j of this.logic.watch_item) {
          if (String(j) === this.myTextareaWatchItems) {
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
      if (this.myTextareaWatchItems.startsWith('sh.')) {
        this.myTextareaWatchItems = this.myTextareaWatchItems.slice(3);
        if (!this.checkItemWithValidItems()) {
          this.wrongWatchItem = true;
          return;
        }
      } else {
        this.wrongWatchItem = true;
        return;
      }
    }
    this.logic.watch_item.push(this.myTextareaWatchItems as unknown as LogicsWatchItem);
    this.myTextareaWatchItems = '';
    this.wrongWatchItem = false;
    this.logicChanged = this.hasLogicChanged();
    return;
  }

  saveCode(reload = false) {
    // this.log.log('LoggingConfigurationComponent.saveCode');
    this.fileService
      .saveFile('logics', this.myEditFilename, this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        // after saving the code, set Orig var to signal the editor shows "unchanged code"
        this.myTextareaOrig = this.myTextarea;
        this.logicChanged = this.hasLogicChanged();
        if (reload) {
          this.loadLogic(this.logic.name); // reloadLogic
        }
        this.cdr.markForCheck();
      });
  }

  discardChanges() {
    this.myTextarea = this.myTextareaOrig;
    this.logic.logic_description = this.logicDescriptionOrig;
    this.logic.group = this.logicGroupOrig;
    this.logic.cycle = this.logicCycleOrig;
    this.logic.crontab = this.logicCrontabOrig;
    this.logic.watch_item = Array.from(this.logicWatchitemOrig);
    for (let i = 0; i < this.parameters.length; i++) {
      this.parameters[i].value = this.parameters[i].value_orig;
    }

    this.logicChanged = this.hasLogicChanged();
  }

  saveParameters(reload: boolean) {
    // this.log.log('LoggingConfigurationComponent.saveParameters');

    const params: Record<string, unknown> = {};

    if (!(parseInt(this.logic.cycle ?? '', 10) > 0)) {
      this.logic.cycle = null;
    }
    params['logic_description'] = this.logic.logic_description;
    params['group'] = this.stringToList(
      Array.isArray(this.logic.group) ? this.logic.group.join(' | ') : (this.logic.group ?? null),
    );
    this.logic.group = this.listToString(params['group'] as string[]);
    params['cycle'] = this.logic.cycle;
    params['crontab'] = this.stringToList(
      Array.isArray(this.logic.crontab) ? this.logic.crontab.join(' | ') : this.logic.crontab,
    );
    this.logic.crontab = this.listToString(params['crontab'] as string[]);

    params['watch_item'] = this.logic.watch_item;
    this.logicWatchitemOrig = Array.from(this.logic.watch_item);

    for (const param in this.pluginParameters) {
      if (param in this.pluginParameters) {
        params[param] = null;
        for (let i = 0; i < this.parameters.length; i++) {
          if (this.parameters[i].name === param) {
            if (this.parameters[i].type === 'list') {
              params[param] = this.stringToList(this.parameters[i].value as string | null);
              this.parameters[i].value = this.listToString(params[param] as string | null);
            } else {
              params[param] = this.parameters[i].value;
            }
            this.parameters[i].value_orig = this.parameters[i].value;
          }
        }
      }
    }

    this.dataService
      .saveLogicParameters(this.myLogicName, params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        // after saving the parameters, set Orig vars to signal the editor shows "unchanged values"
        this.logicDescriptionOrig = this.logic.logic_description;
        this.logicGroupOrig = this.logic.group ?? null;
        this.logicCycleOrig = this.logic.cycle;
        this.logicCrontabOrig = this.logic.crontab ?? null;

        // this.watchitemsFromList();
        // ? this.logicWatchitemOrig = Array.from(this.logic.watch_item_list);
        this.logicChanged = this.hasLogicChanged();

        if (reload) {
          this.loadLogic(this.logic.name); // reloadLogic
        }
        this.cdr.markForCheck();
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
      .setLogicState(this.logic.name, 'trigger')
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
        // this.log.warn('reloadLogic: setLogicState response', response);
        this.myLogicIsLoaded = response !== false;
        // this.getLogics();
        this.cdr.markForCheck();
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
        // this.log.warn('loadLogic: setLogicState response', response);
        this.myLogicIsLoaded = response !== false;
        // this.getLogics();
        this.cdr.markForCheck();
      });
  }

  disableLogic(logicName: string) {
    // this.log.log('disableLogic', {logicName});
    this.dataService
      .setLogicState(logicName, 'disable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        // this.getLogics();
        this.logic.enabled = false;
        this.cdr.markForCheck();
      });
  }

  enableLogic(logicName: string) {
    // this.log.log('enableLogic', {logicName});
    this.dataService
      .setLogicState(logicName, 'enable')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        // this.getLogics();
        this.logic.enabled = true;
        this.cdr.markForCheck();
      });
  }
}
