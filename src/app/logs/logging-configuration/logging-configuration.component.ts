
import {Component, OnInit, AfterViewChecked, ViewChild} from '@angular/core';
import {FilesApiService} from '../../common/services/files-api.service';
import {ServerInfo} from '../../common/models/server-info';
import {ServicesApiService} from '../../common/services/services-api.service';
import {ServerApiService} from '../../common/services/server-api.service';
import {SharedService} from '../../common/services/shared.service';
import {TranslateService} from '@ngx-translate/core';
import {Title} from '@angular/platform-browser';

@Component({
    selector: 'app-logging-configuration',
    templateUrl: './logging-configuration.component.html',
    styleUrls: ['./logging-configuration.component.css'],
    standalone: false
})
export class LoggingConfigurationComponent implements AfterViewChecked, OnInit {

  constructor(private fileService: FilesApiService,
              private dataService: ServicesApiService,
              private dataServiceServer: ServerApiService,
              private translate: TranslateService,
              private titleService: Title) { }

  // -----------------------------------------------------------------
  //  Vars for the codemirror components
  //
  rulers = [];

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
      'Tab': 'insertSoftTab',
      'Shift-Tab': 'indentLess',
      'F11': function(cm) {
        cm.setOption('fullScreen', !cm.getOption('fullScreen'));
        // cm.getScrollerElement().style.maxHeight = 'none';
      },
      'Esc': function(cm, fullScreen) {
        if (cm.getOption('fullScreen')) {
          cm.setOption('fullScreen', false);
        }
      },
      'Ctrl-Q': function(cm) {
        cm.foldCode(cm.getCursor());
      },
      'Shift-Ctrl-Q': function(cm) {
        for (let l = cm.firstLine(); l <= cm.lastLine(); ++l) {
          cm.foldCode({line: l, ch: 0}, null, 'unfold');
        }
      }
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
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
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
      this.rulers.push({color: '#eee', column: i * 4, lineStyle: 'dashed'});
    }

    this.dataServiceServer.getServerinfo()
        .subscribe(
            (response) => {
              this.setTitle(this.translate.instant('MENU.LOGGING_CONFIGURATION'));

              this.fileService.readFile('logging')
                  .subscribe(
                      (response2) => {
                        this.myTextarea = response2;
                        this.myTextareaOrig = response2;
                      }
                  );
            }
        );

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

    this.dataService.CheckYamlText(this.myTextarea)
      .subscribe(
        (response) => {
          this.myTextOutput = <any> response;
          if (this.myTextOutput.startsWith('ERROR:')) {
            this.error_display = true;
          } else {
            this.fileService.saveFile('logging', '', this.myTextarea)
              .subscribe(
                (response2) => {
                  this.myTextareaOrig = this.myTextarea;
                }
              );

          }
          const editor = this.codeEditor.codeMirror;
          editor.refresh();
        }
      );

  }

}
