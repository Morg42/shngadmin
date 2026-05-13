import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate, SelectItem } from 'primeng/api';

import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Listbox } from 'primeng/listbox';
import { FilesApiService } from '../../common/services/files-api.service';
import { LogService } from '../../common/services/log.service';
import { ScenesApiService } from '../../common/services/scenes-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';

@Component({
  selector: 'app-scene-configuration',
  templateUrl: './scene-configuration.component.html',
  styleUrls: ['./scene-configuration.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    Listbox,
    FormsModule,
    CodemirrorModule,
    Dialog,
    PrimeTemplate,
    InputText,
    NgStyle,
    TranslatePipe,
  ],
})
export class SceneConfigurationComponent implements AfterViewChecked, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private dataServiceServer = inject(ServerApiService);
  private fileService = inject(FilesApiService);
  private sceneApiService = inject(ScenesApiService);
  private dataService = inject(ServicesApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers: { color: string; column: number; lineStyle: string }[] = [];

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor', { static: true }) private codeEditor;

  filelist: string[];
  sceneFiles: SelectItem[];
  selectedScenefile: SelectItem;

  reloadScenesButtonDisabled = false;

  myEditFilename = '';
  myTextarea = '';
  myTextareaOrig = '';

  cmOptions = {
    indentWithTabs: false,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      Tab: 'insertSoftTab',
      'Shift-Tab': 'indentLess',
      F11: function (cm) {
        cm.setOption('fullScreen', !cm.getOption('fullScreen'));
        // cm.getScrollerElement().style.maxHeight = 'none';
      },
      Esc: function (cm, fullScreen) {
        if (cm.getOption('fullScreen')) {
          cm.setOption('fullScreen', false);
        }
      },
      'Ctrl-Q': function (cm) {
        cm.foldCode(cm.getCursor());
      },
      'Shift-Ctrl-Q': function (cm) {
        for (let l = cm.firstLine(); l <= cm.lastLine(); ++l) {
          cm.foldCode({ line: l, ch: 0 }, null, 'unfold');
        }
      },
    },
    fullScreen: false,
    lineNumbers: true,
    readOnly: false,
    lineSeparator: '\n',
    rulers: this.rulers,
    mode: 'yaml',
    lineWrapping: false,
    firstLineNumber: 1,
    autorefresh: true,
    fixedGutter: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  };

  editorHelp_display = false;
  error_display = false;
  myTextOutput = '';
  newconfig_display = false;
  newFilename = '';
  add_enabled = false;

  confirmdelete_display: boolean = false;
  delete_param: {};

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // this.log.log('LoggingConfigurationComponent.ngOnInit');

    for (let i = 1; i <= 100; i++) {
      this.rulers.push({ color: '#eee', column: i * 4, lineStyle: 'dashed' });
    }
    this.getSceneFile('');

    this.sceneFiles = [];

    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.setTitle(this.translate.instant('MENU.SCENE_CONFIGURATION'));

        this.fileService
          .getfileList('scenes')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response) => {
            this.filelist = <string[]>response;
            for (let i = 0; i < this.filelist.length; i++) {
              //
              // I get it. The sample code here and in the docs is wrong, it should read like this:
              //
              // fails
              //   this.cities.push({name:'New York', code: 'NY'});
              //
              // correct
              //   this.cities = [...this.cities, {name:'New York', code: 'NY'}];
              //
              this.sceneFiles = [
                ...this.sceneFiles,
                <SelectItem>{ label: this.filelist[i], value: this.filelist[i] },
              ];
            }
            this.cdr.markForCheck();
          });
      });
  }

  ngAfterViewChecked() {
    const editor1 = this.codeEditor.codeMirror;

    if (editor1.getOption('fullScreen')) {
      editor1.setSize('100vw', '100vh');
    } else {
      editor1.setSize('calc(100% - 10px)', 'calc(100vh - 160px)');
      // width: min(80%, 100% - 280px);       calc(80vw - 90px)
    }

    editor1.refresh();
  }

  newConfig() {
    this.newFilename = '';
    this.newconfig_display = true;
  }

  deleteConfig() {
    this.delete_param = { config: this.myEditFilename };
    this.confirmdelete_display = true;
  }

  DeleteConfigConfirm() {
    // this.log.log('SceneConfigurationComponent.DeleteConfigConfirm:');

    // close confirm dialog
    this.confirmdelete_display = false;

    // delete on backend server
    this.fileService
      .deleteFile('scenes', this.myEditFilename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response: unknown) => {
        if (response) {
          // close configuration dialog
          this.confirmdelete_display = false;
          this.log.log('SceneConfigurationComponent.DeleteConfigConfirm(): call ngOnInit()');
          this.ngOnInit();
          //            this.restart_core_button = true;
          this.cdr.markForCheck();
        }
      });

    // alert('code for removal of plugin "' + this.dialog_configname + '" configurations is not yet implemented');

    return true;
  }

  checkInput() {
    this.add_enabled = false;
    if (this.newFilename.length > 0) {
      this.add_enabled = true;
      for (const filenno in this.filelist) {
        const fn = this.filelist[filenno].slice(0, -5);
        if (this.newFilename === fn) {
          this.add_enabled = false;
        }
      }
    }
  }

  addFile() {
    this.newconfig_display = false;

    this.myTextarea = '# ' + this.newFilename + '.yaml\n';
    this.myTextareaOrig = this.myTextarea;
    this.myEditFilename = this.newFilename;
    this.cmOptions.readOnly = false;

    this.fileService
      .saveFile('scenes', this.myEditFilename, this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        this.myTextareaOrig = this.myTextarea;

        this.sceneFiles = [];
        this.fileService
          .getfileList('scenes')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response) => {
            this.filelist = <string[]>response;
            for (let i = 0; i < this.filelist.length; i++) {
              this.sceneFiles = [
                ...this.sceneFiles,
                <SelectItem>{ label: this.filelist[i], value: this.filelist[i] },
              ];
            }
            this.cdr.markForCheck();
          });
        this.cdr.markForCheck();
      });
  }

  sceneFileSelected() {
    let filename = this.selectedScenefile.value;
    if (filename.toLowerCase().endsWith('.yaml')) {
      filename = filename.slice(0, -5);
      // this.log.log('sceneFileSelected()' , {filename});
      this.getSceneFile(filename);
    } else {
      this.myEditFilename = '';
      this.myTextarea = '';
      this.cmOptions.readOnly = true;
      this.myTextarea = this.translate.instant('SCENE_CONFIG.FILETYPE_UNSUPPORTED');
    }
  }

  getSceneFile(filename) {
    this.myEditFilename = '';
    this.myTextarea = '';
    this.cmOptions.readOnly = true;
    if (filename === '') {
      return;
    }

    this.fileService
      .readFile('scenes', filename)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextarea = response;
        this.myTextareaOrig = response;
        if (this.myTextarea === '') {
          this.myTextarea = this.translate.instant('SCENE_CONFIG.FILE_NOT_FOUND');
        } else {
          this.myEditFilename = filename;
          this.cmOptions.readOnly = false;
        }
        this.cdr.markForCheck();
      });
  }

  saveConfig() {
    // this.log.log('SceneConfigurationComponent.saveConfig');

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = response as string;
        if (this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
        } else {
          this.fileService
            .saveFile('scenes', this.myEditFilename, this.myTextarea)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2) => {
              this.myTextareaOrig = this.myTextarea;
              this.cdr.markForCheck();
            });
        }
        if (this.codeEditor !== undefined) {
          const editor = this.codeEditor.codeMirror;
          editor.refresh();
        }
        this.cdr.markForCheck();
      });
  }

  reloadScene() {
    // this.log.log('reloadPlugin', {pluginConfigName});

    this.sceneApiService
      .reloadScene(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.log.log('reloadScene', '\nresponse', { response });
      });
  }

  reloadScenes() {
    // this.log.log('reloadPlugin', {pluginConfigName});

    this.reloadScenesButtonDisabled = true;
    this.sceneApiService
      .reloadScenes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.log.log('reloadScenes', '\nresponse', { response });
        setTimeout(() => {
          this.reloadScenesButtonDisabled = false;
        }, 200);
      });
  }
}
