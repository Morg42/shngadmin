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
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { FilesApiService } from '../../common/services/files-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { ServicesApiService } from '../../common/services/services-api.service';

@Component({
  selector: 'app-logging-configuration',
  templateUrl: './logging-configuration.component.html',
  styleUrls: ['./logging-configuration.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    ButtonDirective,
    CodemirrorModule,
    FormsModule,
    Dialog,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class LoggingConfigurationComponent implements AfterViewChecked, OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private fileService = inject(FilesApiService);
  private dataService = inject(ServicesApiService);
  private dataServiceServer = inject(ServerApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers: { color: string; column: number; lineStyle: string }[] = [];

  // -----------------------------------------------------
  //  Vars for the YAML syntax checker
  //
  @ViewChild('codeeditor', { static: true }) private codeEditor;

  myEditFilename: string;
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

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // console.log('LoggingConfigurationComponent.ngOnInit');

    this.myEditFilename = 'logging';
    for (let i = 1; i <= 100; i++) {
      this.rulers.push({ color: '#eee', column: i * 4, lineStyle: 'dashed' });
    }

    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.setTitle(this.translate.instant('MENU.LOGGING_CONFIGURATION'));

        this.fileService
          .readFile('logging')
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response2) => {
            this.myTextarea = response2;
            this.myTextareaOrig = response2;
            this.cdr.markForCheck();
          });
      });
  }

  ngAfterViewChecked() {
    const editor1 = this.codeEditor.codeMirror;
    if (editor1.getOption('fullScreen')) {
      editor1.setSize('100vw', '100vh');
    } else {
      editor1.setSize('calc(100vw - 70px)', 'calc(100vh - 160px)');
      // editor1.setSize('93vw', '78vh');
    }
    editor1.refresh();
  }

  saveConfig() {
    // console.log('LoggingConfigurationComponent.saveConfig');

    this.dataService
      .CheckYamlText(this.myTextarea)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.myTextOutput = <any>response;
        if (this.myTextOutput.startsWith('ERROR:')) {
          this.error_display = true;
        } else {
          this.fileService
            .saveFile('logging', '', this.myTextarea)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2) => {
              this.myTextareaOrig = this.myTextarea;
              this.cdr.markForCheck();
            });
        }
        const editor = this.codeEditor.codeMirror;
        editor.refresh();
        this.cdr.markForCheck();
      });
  }
}
