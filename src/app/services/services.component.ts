import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from '../common/services/app-config.service';
import { UserPreferencesService } from '../common/services/user-preferences.service';
// import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

import { saveAs } from 'file-saver';

import { FilesApiService } from '../common/services/files-api.service';
import { ServerApiService } from '../common/services/server-api.service';
import { ServicesApiService } from '../common/services/services-api.service';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ServerInfo } from '../common/models/server-info';
import { SharedService } from '../common/services/shared.service';

import { NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { sha512 } from 'js-sha512';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';
import { Tab as Tab_1, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
// import {LogicsWatchItem} from '../common/models/logics-watch-item';
// import {SelectItem} from 'primeng/api';

export interface CacheEntryType {
  filename: string;
  created: string;
  last_modified: string;
  checked?: boolean;
}

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css'],
  encapsulation: ViewEncapsulation.None,
  providers: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab_1,
    TabPanels,
    TabPanel,
    NgOptimizedImage,
    Select,
    FormsModule,
    ButtonDirective,
    CodemirrorModule,
    InputText,
    Dialog,
    PrimeTemplate,
    FileUpload,
    TranslatePipe,
  ],
})
export class ServicesComponent implements AfterViewChecked, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  public shared = inject(SharedService);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private dataServiceServer = inject(ServerApiService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private userPrefs = inject(UserPreferencesService);

  //  schedulerinfo: SchedulerInfo[];

  serverInfo = <ServerInfo>{};
  default_language: string;
  shng_status: string;
  status_errorcount = 0;

  valid_languagelist: { label: string; value: string }[] = [];

  valid_default_language = '          ';
  selected_language: string | null = null;
  shng_statuscode = 0;

  pwd_clear = '';
  pwd_hash: string;
  pwd_show: boolean;

  backup_disabled = false;
  restore_disabled = false;
  show_backup_confirm = false;
  show_restore_chooser = false;

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers: { color: string; column: number; lineStyle: string }[] = [];

  // -----------------------------------------------------
  //  Vars for the EVAL syntax checker
  //
  @ViewChild('evalcodeeditor', { static: true }) private evalCodeEditor;
  @ViewChild('evalcodeeditor2', { static: true }) private evalCodeEditor2;

  myEvalTextarea = '';
  myRelativeTo = '';
  myEvalResult = '';
  myResultType = '';
  cmEvalOptions = {
    indentWithTabs: false,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      Tab: 'insertSoftTab',
      'Shift-Tab': 'indentLess',
    },
    lineNumbers: true,
    readOnly: false,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'python',
    lineWrapping: false,
    firstLineNumber: 1,
    autorefresh: true,
    fixedGutter: true,
  };

  myEvalTextOutput = '';
  cmEvalOptionsOutput = {
    indentWithTabs: false,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      Tab: 'insertSoftTab',
      'Shift-Tab': 'indentLess',
    },
    lineNumbers: true,
    readOnly: false,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'python',
    lineWrapping: false,
    firstLineNumber: 1,
    autorefresh: true,
    fixedGutter: true,
  };

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor', { static: true }) private codeEditor;
  @ViewChild('codeeditor2', { static: true }) private codeEditor2;

  myTextarea = '';
  cmOptions = {
    indentWithTabs: false,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      Tab: 'insertSoftTab',
      'Shift-Tab': 'indentLess',
    },
    lineNumbers: true,
    readOnly: false,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'yaml',
    lineWrapping: false,
    firstLineNumber: 1,
    autorefresh: true,
    fixedGutter: true,
  };

  myTextOutput = '';
  cmOptionsOutput = {
    indentWithTabs: false,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      Tab: 'insertSoftTab',
      'Shift-Tab': 'indentLess',
    },
    lineNumbers: true,
    readOnly: false,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'yaml',
    lineWrapping: false,
    firstLineNumber: 1,
    autorefresh: true,
    fixedGutter: true,
  };

  // -----------------------------------------------------
  //  Vars for the YAML converter
  //
  @ViewChild('convertercodeeditor', { static: true }) private converterCodeEditor;
  @ViewChild('convertercodeeditor2', { static: true }) private converterCodeEditor2;

  myConverterTextarea = '';
  cmConveterOptions = {
    lineNumbers: true,
    readOnly: false,
    indentUnit: 4,
    lineSeparator: '\n',
    rulers: this.rulers,
    // mode: 'yaml',
    lineWrapping: false,
    firstLineNumber: 1,
    indentWithTabs: false,
    autorefresh: true,
    fixedGutter: true,
  };

  myConverterTextOutput = '';
  cmConverterOptionsOutput = {
    lineNumbers: true,
    readOnly: false,
    indentUnit: 4,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'yaml',
    lineWrapping: false,
    firstLineNumber: 1,
    indentWithTabs: false,
    autorefresh: true,
    fixedGutter: true,
  };

  cacheInfo: CacheEntryType[] = [];
  cacheAllChecked: boolean;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // console.log('ServicesComponent.ngOnInit');

    for (let i = 1; i <= 100; i++) {
      this.rulers.push({ color: '#eee', column: i * 4, lineStyle: 'dashed' });
    }

    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.shng_status = '?';
        this.default_language = this.appConfig.defaultLanguage;

        this.serverInfo = <ServerInfo>response;

        this.getShngStatus();

        //        this.valid_languagelist = [{label: 'English', value: 'en'},{label: 'Deutsch', value: 'de'},{label: 'Français', value: 'fr'},
        //        {label: 'Polski', value: 'pl'}];
        this.valid_languagelist = [
          { label: 'English', value: 'en' },
          { label: 'Deutsch', value: 'de' },
          { label: 'Français', value: 'fr' },
        ];

        // this.valid_default_language = 'Deutsch';
        this.selected_language = this.default_language;

        this.setTitle(this.translate.instant('SERVICES.SERVICES'));

        this.loadCacheOrphans();
        this.cdr.markForCheck();
      });
  }

  loadCacheOrphans() {
    this.dataService
      .getCacheOrphans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.cacheInfo = <CacheEntryType[]>response;
        this.cacheAllChecked = false;
        // console.log('loadChacheOrphans', this.cacheInfo);
        this.cdr.markForCheck();
      });
  }

  deleteCacheEntry(entryNr) {
    // console.log('deleteCacheEntry', this.cacheInfo[entryNr].filename);
    this.dataService
      .deleteCacheFile(this.cacheInfo[entryNr].filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadCacheOrphans();
      });
  }

  deleteCacheSelected() {
    const filelist: string[] = [];
    for (let i = 0; i < this.cacheInfo.length; i++) {
      if (this.cacheInfo[i].checked) {
        filelist.push(this.cacheInfo[i].filename);
      }
    }

    this.dataService
      .deleteCacheFile(JSON.stringify(filelist))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadCacheOrphans();
      });
  }

  cacheCheckAll() {
    for (let i = 0; i < this.cacheInfo.length; i++) {
      this.cacheInfo[i].checked = this.cacheAllChecked;
    }
  }

  ngAfterViewChecked() {
    const evalEditor1 = this.evalCodeEditor.codeMirror;
    const evalEditor2 = this.evalCodeEditor2.codeMirror;
    // const h = evalEditor1.getViewport();

    evalEditor1.setSize('100%', 160);
    evalEditor1.refresh();
    evalEditor2.setSize('100%', 160);
    evalEditor2.refresh();

    const editor1 = this.codeEditor.codeMirror;
    const editor2 = this.codeEditor2.codeMirror;
    editor1.refresh();
    editor2.refresh();
    const editor3 = this.converterCodeEditor.codeMirror;
    const editor4 = this.converterCodeEditor2.codeMirror;
    editor3.refresh();
    editor4.refresh();
  }

  createPwdHash() {
    console.log('createPwdHash');
    this.pwd_hash = sha512(this.pwd_clear);
  }

  checkYaml() {
    // this.myTextoutput = this.myTextarea;

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        this.cmOptionsOutput.lineNumbers = true;
        // if (this.myTextOutput.startsWith('ERROR:')) {
        //   this.cmOptionsOutput.lineNumbers = false;
        // }
        this.cmOptionsOutput.lineNumbers = !this.myTextOutput.startsWith('ERROR:');
        const editor2 = this.codeEditor2.codeMirror;
        editor2.refresh();
        this.cdr.markForCheck();
      });
  }

  checkEval() {
    const evalData = { expression: this.myEvalTextarea, relative_to: this.myRelativeTo };
    this.dataService
      .CheckEvalData(evalData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const myResponse = response as { expression: string; type: string; result: unknown };
        this.myEvalTextOutput = myResponse.expression;
        this.myResultType = myResponse.type;
        if (this.myResultType === 'list' || this.myResultType === 'dict') {
          this.myEvalResult = JSON.stringify(myResponse.result);
        } else {
          this.myEvalResult = String(myResponse.result);
        }
        this.cdr.markForCheck();
      });
  }

  convertYaml() {
    // this.myTextoutput = this.myTextarea;

    this.dataService
      .ConvertToYamlText(this.myConverterTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myConverterTextOutput = response as string;
        this.cmConverterOptionsOutput.lineNumbers = true;
        //          if (this.myConverterTextOutput.startsWith('ERROR:')) {
        //            this.cmConverterOptionsOutput.lineNumbers = false;
        //          }
        //          const editor4 = this.converterCodeEditor2.codeMirror;
        //          editor4.refresh();
        this.cdr.markForCheck();
      });
  }

  setLanguage() {
    console.log('setLanguage', this.selected_language);
    this.appConfig.setDefaultLanguage(this.selected_language!);
    this.userPrefs.setLanguage(this.selected_language!); // persist across reloads
    this.shared.setGuiLanguage();
    this.default_language = this.appConfig.defaultLanguage;
  }

  // -------------------------------------------------------
  // translate status text of SmartHomeNG
  //
  translate_shngStatus(text) {
    //    const translated_text = this.translate.instant('SHNG_STATE.' + text);
    //    if (translated_text.startsWith('SHNG_STATE.')) {
    //      return text;
    //    }
    return this.translate.instant('SHNG_STATE.' + text);
  }

  // -------------------------------------------------------
  // poll the status of SmartHomeNG and schedule next poll
  //
  getShngStatus() {
    // duration in seconds
    const interval1 = 5000; // standard polling: every 5 seconds
    const interval2 = 1000; // polling while (re)starting: every second
    const interval3 = 3000; // polling while in error state (shng not running)
    this.dataServiceServer
      .getShngServerStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const res = response as { code?: number; text?: string; details?: string };
        if (res.code === undefined) {
          // shng is not running
          this.status_errorcount += 1;
          console.log('getShngStatus', 'SmartHomeNG not running');
          this.shng_status = this.translate_shngStatus('waiting') + '...';
        } else {
          // console.log('getShngStatus', res.code, res.text);
          this.shng_statuscode = res.code;
          this.shng_status = this.translate_shngStatus(res.text);
          if (res.details !== undefined) {
            this.shng_status += ' (' + res.details + ')';
          }
          this.status_errorcount = 0;
        }
        if (this.status_errorcount < 20) {
          // schedule next status check
          let interval = interval1;
          if (res.code !== 20) {
            // code = 20 -> status running
            if (this.status_errorcount === 0) {
              interval = interval2;
            } else {
              interval = interval3;
            }
          }
          this.sleep(interval).then(() => {
            this.getShngStatus();
          });
        } else {
          console.warn('getShngStatus', 'Statuspolling aborted');
          this.shng_status = this.translate_shngStatus('not active');
          this.shng_statuscode = -1;
        }
        this.cdr.markForCheck();
      });
  }

  sleep(time) {
    // https://davidwalsh.name/javascript-sleep-function
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  // -------------------------------------------------------
  // restart SmartHomeNG server application
  //
  restartShng() {
    this.dataServiceServer
      .restartShngServer()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const res = response as { result?: string };
        console.log('restartShng', res.result);
        this.shng_status = this.translate_shngStatus('Restart clicked');
        this.shng_statuscode = -1;
        this.cdr.markForCheck();
      });
  }

  downloadBackup() {
    const todayDate = new Date();
    const dd = String(todayDate.getDate()).padStart(2, '0');
    const mm = String(todayDate.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = todayDate.getFullYear();
    const today = yyyy + '-' + mm + '-' + dd;

    this.backup_disabled = true;
    this.restore_disabled = true;

    let filename = '';
    if (this.serverInfo.backup_stem != null) {
      filename = this.serverInfo.backup_stem;
    }
    if (filename !== '') {
      filename += '_';
    }
    filename += 'shng_config_backup_' + today + '.zip';

    this.dataServiceServer
      .downloadConfigBackup()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const res = response as Blob;
        // saveAs(res, 'shng_config_backup_' + today + '.zip');
        saveAs(res, filename);
        this.show_backup_confirm = true;
        this.backup_disabled = false;
        this.restore_disabled = false;

        this.ngOnInit();
        this.cdr.markForCheck();
      });
  }

  restoreBackup() {
    this.backup_disabled = true;
    this.restore_disabled = true;
    this.show_restore_chooser = true;

    this.backup_disabled = false;
    this.restore_disabled = false;
  }

  myUploader(event, form) {
    console.log('myUploader', event.files);
    console.log('myUploader', event.files[0].name);

    let filecontent: string;

    const reader = new FileReader();

    // file reading started
    reader.addEventListener('loadstart', function () {
      console.log('File reading started');
    });

    // file reading finished successfully
    reader.addEventListener('load', function () {
      // const text = this.result;
      // contents of the file
      // console.log(text);
    });

    // file reading failed
    reader.addEventListener('error', function () {
      alert('Error : Failed to read file');
    });

    // file read progress
    reader.addEventListener('progress', function (e) {
      if (e.lengthComputable === true) {
        const percent_read = Math.floor((e.loaded / e.total) * 100);
        console.log(percent_read + '% read');
      }
    });

    reader.onloadend = () => {
      // console.warn(reader.result);
      filecontent = reader.result as string;

      this.fileService
        .saveFile('restore', event.files[0].name, filecontent)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.ngOnInit();
        });

      form.clear();
      this.show_restore_chooser = false;
    };

    // read as text file
    // reader.readAsText(event.files[0]);
    // reader.readAsBinaryString(event.files[0]);
    reader.readAsDataURL(event.files[0]);
  }

  doUpload(form) {
    console.log('doUpload');

    /*
    this.fileService.saveFile('restore', event.files[0].name, 'TEST test')
      .subscribe(
        (response2) => {
        }
      );
*/

    form.clear();
    this.show_restore_chooser = false;
  }
}
