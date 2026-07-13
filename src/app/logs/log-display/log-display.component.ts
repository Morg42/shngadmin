import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  viewChild,
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
  private route = inject(ActivatedRoute);
  private dataService = inject(LogsApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  readonly codeEditor = viewChild<CodeEditorComponent>('codeeditor');

  loglevels: DropDownEntry[] = [];

  logs_info: LogsInfoDict = {};
  default_log = '';

  // Selections and filters are ngModel-bound plain fields: they only change
  // through user interaction, and the DOM event itself triggers the refresh.
  // Everything written asynchronously (after an API response) is a signal.
  readonly logs = signal<DropDownEntry[]>([]);
  selectedLog: string | null = null;

  readonly files = signal<DropDownEntry[]>([]);
  selectedFile: string | null = null;

  displayLogfile = '';
  text_filter = '';
  level_filter = 'ALL';

  readonly logfile_chunk = signal<LogfileChunk | null>(null);
  readonly first_chunk = signal(true);
  readonly last_chunk = signal(true);
  readonly chunk_no = signal(1);
  readonly logfile_content = signal('');

  readonly cmLineNumbers = signal(true);
  readonly cmFirstLineNumber = signal(1);

  readonly editorHelp_display = signal(false);
  readonly editorFullscreen = signal(false);
  readonly spinner_display = signal(false);

  ngOnInit() {
    // Support deep-linking: /logs/:logname pre-selects a log file on load.
    // Strip the .log extension if present — the API identifies logs by base name.
    let logParam = this.route.snapshot.paramMap.get('logname');
    if (logParam !== null) {
      if (logParam.endsWith('.log')) {
        logParam = logParam.slice(0, -4);
      }
    }
    this.log.log({ logParam });

    this.loglevels.push({ label: 'ALL', value: 'ALL' });
    this.loglevels.push({ label: 'DEVELOP', value: ' DEVELOP ' });
    this.loglevels.push({ label: 'DEBUG', value: ' DEBUG ' });
    this.loglevels.push({ label: 'INFO', value: ' INFO ' });
    this.loglevels.push({ label: 'WARNING', value: ' WARNING ' });
    this.loglevels.push({ label: 'ERROR', value: ' ERROR ' });
    this.loglevels.push({ label: 'CRITICAL', value: ' CRITICAL ' });

    this.titleService.setTitle(this.translate.instant('MENU.LOGS_DISPLAY'));

    this.dataService
      .getLogs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response2) => {
        const logs = response2 as LogsType;
        this.logs_info = logs['logs'];
        this.default_log = logs['default'];
        const entries: DropDownEntry[] = [];
        for (let log in this.logs_info) {
          if (this.logs_info.hasOwnProperty(log)) {
            entries.push({ label: log, value: log });
          }
        }
        this.logs.set(entries);
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
      });
  }

  fillTimeframe(useActual = false) {
    if (this.selectedLog === null) {
      this.files.set([]);
      this.selectedFile = null;
      this.readLogfile();
    } else {
      const files: DropDownEntry[] = [];

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
          files.unshift(wrk);
        } else {
          files.push(wrk);
        }
        files.sort((a, b) => a.label.localeCompare(b.label));
        files.reverse();
      }

      this.files.set(files);
      this.selectedFile = files[0].value;
      this.readLogfile(0); // 0 = last (newest) chunk
    }
  }

  changedTimeframe() {
    this.readLogfile(0); // 0 = last (newest) chunk
  }

  filterLogChunk() {
    this.cmLineNumbers.set(this.level_filter === 'ALL' && this.text_filter === '');
    const chunk = this.logfile_chunk();
    if (!chunk) {
      this.logfile_content.set('');
      return;
    }

    const filter = this.text_filter;
    let content = '';
    for (let i = 0; i < chunk.loglines.length; i++) {
      if (this.level_filter === 'ALL' || chunk.loglines[i].indexOf(this.level_filter) > -1) {
        if (filter === '' || chunk.loglines[i].indexOf(filter) > -1) {
          content += chunk.loglines[i];
        }
      }
    }
    this.logfile_content.set(content);
  }

  scrollDown() {
    this.codeEditor()?.scrollToEnd();
  }

  openSearch() {
    this.codeEditor()?.openSearch();
  }

  gotoLine() {
    this.codeEditor()?.triggerGotoLine();
  }

  toggleLineWrap() {
    this.codeEditor()?.toggleLineWrapping();
  }

  toggleEditorFullscreen() {
    this.codeEditor()?.toggleFullscreen();
    // editorFullscreen is kept in sync via (fullscreenChange) binding
  }

  onFullscreenChange(isFullscreen: boolean) {
    this.editorFullscreen.set(isFullscreen);
  }

  readLogfile(chunk = 1) {
    if (this.selectedLog === null || this.selectedFile === null) {
      this.displayLogfile = '';
      this.logfile_content.set('');
    } else {
      // chunk === 0 is the sentinel for "newest chunk" — used on initial load,
      // timeframe change, and the fast-forward button.  Scroll to bottom in
      // those cases so the user sees the latest entries immediately.
      // Explicit chunk numbers (prev / next / first-page navigation) keep the
      // viewport at the top so the user can read from the beginning of that chunk.
      const scrollAfterLoad = chunk === 0;

      this.spinner_display.set(true);
      this.displayLogfile = String(this.selectedFile);

      this.dataService
        .readLogfile(this.displayLogfile, chunk)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((response) => {
          const loaded = response as unknown as LogfileChunk;
          if (loaded.lines[0] !== undefined) {
            // Replace non-breaking spaces (U+00A0, charCode 160) with regular spaces.
            // The backend can emit NBSP in log lines; CodeMirror's monospace layout
            // treats them differently from regular spaces, breaking column alignment.
            for (let i = 0; i < loaded.loglines.length; i++) {
              let wrk2 = '';
              for (let c = 0; c < loaded.loglines[i].length; c++) {
                if (loaded.loglines[i][c].charCodeAt(0) === 160) {
                  wrk2 += ' ';
                } else {
                  wrk2 += loaded.loglines[i][c];
                }
              }
              loaded.loglines[i] = wrk2;
            }
          }
          this.logfile_chunk.set(loaded);
          this.first_chunk.set(loaded.lines[0] === 1);
          this.last_chunk.set(loaded.lastchunk);
          this.chunk_no.set(loaded.chunk);
          this.cmLineNumbers.set(true);
          this.cmFirstLineNumber.set(loaded.lines[0]);

          this.filterLogChunk();
          this.spinner_display.set(false);
          // Defer scroll until after Angular's change-detection cycle updates the
          // CodeMirror DOM so scrollToEnd() reads the correct scrollHeight.
          if (scrollAfterLoad) setTimeout(() => this.scrollDown());
        });
    }
  }
}
