import {
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
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LogsInfoDict, LogsType } from '../../common/models/logfiles-info';
import { LogService } from '../../common/services/log.service';
import { LogsApiService } from '../../common/services/logs-api.service';

interface LogfileChunk {
  lines: number[];
  loglines: string[];
  lastchunk: boolean;
  chunk: number;
  chunks?: number;
}

import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { CodeEditorComponent } from '../../common/components/code-editor/code-editor.component';

interface DropDownEntry {
  label: string;
  value: string;
}

@Component({
  selector: 'app-logs',
  templateUrl: './log-display.component.html',
  styleUrls: ['./log-display.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Select,
    FormsModule,
    ButtonDirective,
    InputText,
    CodeEditorComponent,
    Dialog,
    NgStyle,
    ProgressSpinner,
    PrimeTemplate,
    TranslatePipe,
  ],
})
export class LogDisplayComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private dataService = inject(LogsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  @ViewChild('codeeditor') codeEditor?: CodeEditorComponent;

  loglevels: DropDownEntry[] = [];

  logs_info: LogsInfoDict = {};
  default_log = '';

  logs: DropDownEntry[] = [];
  selectedLog: string | null = null;

  files: DropDownEntry[] = [];
  selectedFile: string | null = null;

  displayLogfile = '';
  text_filter = '';
  level_filter = 'ALL';

  nbsp = String.fromCharCode(160);

  logfile_chunk: LogfileChunk | null = null;
  first_chunk = true;
  last_chunk = true;
  chunk_no = 1;
  logfile_content = '';

  cmLineNumbers = true;
  cmFirstLineNumber = 1;

  editorHelp_display = false;
  editorFullscreen = false;
  spinner_display: boolean = false;

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    // test if component is called with a parameter and remove '.log' from the parameter
    let logParam = this.route.snapshot.paramMap.get('logname');
    if (logParam !== null) {
      if (logParam.endsWith('.log')) {
        logParam = logParam.slice(0, -4);
      }
    }
    this.log.log({ logParam });

    this.loglevels.push({ label: 'ALL', value: 'ALL' });
    this.loglevels.push({ label: 'DEBUG', value: ' DEBUG ' });
    this.loglevels.push({ label: 'INFO', value: ' INFO ' });
    this.loglevels.push({ label: 'WARNING', value: ' WARNING ' });
    this.loglevels.push({ label: 'ERROR', value: ' ERROR ' });
    this.loglevels.push({ label: 'CRITICAL', value: ' CRITICAL ' });

    this.setTitle(this.translate.instant('MENU.LOGS_DISPLAY'));

    this.dataService
      .getLogs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        const logs = response2 as LogsType;
        this.logs_info = logs['logs'];
        this.default_log = logs['default'];
        this.logs = [];
        for (let log in this.logs_info) {
          if (this.logs_info.hasOwnProperty(log)) {
            this.logs.push({ label: log, value: log });
          }
        }
        this.selectedLog = null;
        if (logParam !== null) {
          if (logParam in this.logs_info) {
            this.selectedLog = logParam;
            this.fillTimeframe(true);
          }
        }
        if (this.selectedLog == null && this.default_log in this.logs_info) {
          this.selectedLog = this.default_log;
          this.fillTimeframe(true);
        }
        this.cdr.markForCheck();
      });
  }

  fillTimeframe(useActual = false) {
    if (this.selectedLog === null) {
      this.files = [];
      this.selectedFile = null;
      this.readLogfile();
    } else {
      this.files = [];

      this.logs_info[this.selectedLog].push(this.logs_info[this.selectedLog][0]);
      this.logs_info[this.selectedLog].splice(0, 1);

      for (let i = 0; i < this.logs_info[this.selectedLog].length; i++) {
        // build entry for drop down list to select logfile
        let tf = this.logs_info[this.selectedLog][i][0];
        const tf_split = tf.split('.');
        if (tf_split.length > 2) {
          if (tf_split[1] === 'log') {
            // for logfile names build as <logname>.log.<date>
            tf = '*' + tf_split[2];
          }
          if (tf_split[2] === 'log') {
            // for logfile names build as <logname>.<date>.log
            tf = '*' + tf_split[1];
          }
        }
        if (tf_split.length === 2) {
          // for logfile names build as <logname>.log
          tf = '.' + this.translate.instant('LOGS.ACTUAL');
        }
        // add file size to entry for drop down list
        let tfsize = this.logs_info[this.selectedLog][i][1];
        let tfunit = 'KB';
        if (Number(tfsize) > 1024) {
          tfsize = (Number(tfsize) / 1024).toFixed(1);
          tfunit = 'MB';
        }
        const wrk = {
          label: tf.slice(1) + ' (' + tfsize + tfunit + ')',
          value: this.logs_info[this.selectedLog][i][0],
        };

        if (tf_split.length === 2) {
          this.files.unshift(wrk);
        } else {
          this.files.push(wrk);
        }
        this.files.sort((a, b) => a.label.localeCompare(b.label));
        this.files.reverse();
      }

      this.selectedFile = this.files[0].value;
      this.readLogfile(0); // 0 = last (newest) chunk
    }
  }

  changedTimeframe() {
    this.readLogfile(0); // 0 = last (newest) chunk
  }

  filterLogChunk() {
    this.logfile_content = '';
    this.cmLineNumbers = this.level_filter === 'ALL' && this.text_filter === '';
    if (!this.logfile_chunk) return;

    const filter = this.text_filter;
    for (let i = 0; i < this.logfile_chunk.loglines.length; i++) {
      if (
        this.level_filter === 'ALL' ||
        this.logfile_chunk.loglines[i].indexOf(this.level_filter) > -1
      ) {
        if (filter === '' || this.logfile_chunk.loglines[i].indexOf(filter) > -1) {
          this.logfile_content += this.logfile_chunk.loglines[i];
        }
      }
    }
  }

  scrollDown() {
    this.codeEditor?.scrollToEnd();
  }

  toggleEditorFullscreen() {
    this.codeEditor?.toggleFullscreen();
    // editorFullscreen is kept in sync via (fullscreenChange) binding
  }

  onFullscreenChange(isFullscreen: boolean) {
    this.editorFullscreen = isFullscreen;
    this.cdr.markForCheck();
  }

  readLogfile(chunk = 1) {
    if (this.selectedLog === null || this.selectedFile === null) {
      this.displayLogfile = '';
      this.logfile_content = '';
    } else {
      this.spinner_display = true;
      this.displayLogfile = String(this.selectedFile);

      this.dataService
        .readLogfile(this.displayLogfile, chunk)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          // this.log.log({response});
          this.logfile_chunk = response as unknown as LogfileChunk;
          this.first_chunk = this.logfile_chunk.lines[0] === 1;
          this.last_chunk = this.logfile_chunk.lastchunk;
          this.chunk_no = this.logfile_chunk.chunk;
          this.cmLineNumbers = true;
          this.cmFirstLineNumber = this.logfile_chunk.lines[0];
          if (this.cmFirstLineNumber !== undefined) {
            for (let i = 0; i < this.logfile_chunk.loglines.length; i++) {
              let wrk2 = '';
              for (let c = 0; c < this.logfile_chunk.loglines[i].length; c++) {
                if (this.logfile_chunk.loglines[i][c].charCodeAt(0) === 160) {
                  wrk2 += ' ';
                } else {
                  wrk2 += this.logfile_chunk.loglines[i][c];
                }
              }
              this.logfile_chunk.loglines[i] = wrk2;
            }
          }

          this.filterLogChunk();
          this.spinner_display = false;
          this.cdr.markForCheck();
        });
    }
  }
}
