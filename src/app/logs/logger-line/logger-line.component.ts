import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { LoggerInfo } from '../../common/models/loggers-info';
import { LogService } from '../../common/services/log.service';

@Component({
  selector: 'app-logger-line',
  templateUrl: './logger-line.component.html',
  styleUrls: ['./logger-line.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Select,
    FormsModule,
    RouterLink,
    Dialog,
    PrimeTemplate,
    ButtonDirective,
    Checkbox,
    Message,
    TranslatePipe,
  ],
})
export class LoggerLineComponent {
  @Input() loggerName!: string;
  @Input() logger!: LoggerInfo;
  @Input() loggerActive!: boolean;
  @Input() definedHandlers!: string[];
  // @Input() loggerActiveLevel: any;
  @Output() levelChange = new EventEmitter();
  @Output() loggerDelete = new EventEmitter();
  @Output() modifyHandlers = new EventEmitter();

  levelOptions: {}[] = [
    { label: 'ERROR', value: 'ERROR' },
    { label: 'WARNING', value: 'WARNING' },
    { label: 'NOTICE', value: 'NOTICE' },
    { label: 'INFO', value: 'INFO' },
    { label: 'DBGHIGH', value: 'DBGHIGH' },
    { label: 'DBGMED', value: 'DBGMED' },
    { label: 'DBGLOW', value: 'DBGLOW' },
    { label: 'DEBUG', value: 'DEBUG' },
  ];

  levelDefault: string = 'WARNING';

  confirmdelete_display: boolean = false;
  loggerToDelete: string = '';
  delete_param!: {};

  header_param!: {};
  handlers: { name: string; key: string }[] = [];
  chooseHandlers_display: boolean = false;
  // loggerToModify: string = '';
  choosableHandlers: { name: string; key: string; value: boolean[]; disabled: boolean }[] = [];
  choosableHandlers1: { name: string; key: string; value: boolean[]; disabled: boolean }[] = [];
  choosableHandlers2: { name: string; key: string; value: boolean[]; disabled: boolean }[] = [];
  handlersChangeEnabled = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly log = inject(LogService);

  getParent(logger: string) {
    const parts = logger.split('.');
    parts.pop();
    return parts.join('.');
  }

  baseName(str: string, withExtension = true) {
    let base = str;
    base = base.substring(base.lastIndexOf('/') + 1);
    if (!withExtension && base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }

  levelChanged(lg: unknown, level: unknown) {
    let activeLevel = this.levelDefault;
    if (level !== null) {
      activeLevel = this.logger.active.level;
    }
    this.levelChange.emit(activeLevel);
  }

  loggerIsDeletable(logger: string) {
    if (
      logger === 'plugins' ||
      logger === 'logics' ||
      logger === 'items' ||
      logger === 'functions' ||
      logger === 'lib' ||
      logger === 'modules'
    ) {
      return false;
    }
    if (logger.startsWith('plugins.')) {
      return true;
    }

    if (logger.startsWith('logics.')) {
      return true;
    }

    if (logger.startsWith('items.')) {
      return true;
    }

    if (
      logger.startsWith('functions.') ||
      logger.startsWith('lib.') ||
      logger.startsWith('modules.')
    ) {
      return true;
    }

    return false;
  }

  // ------------------------------------------------------------------------------
  //   functions to support choosing of handlers
  // ------------------------------------------------------------------------------

  chooseHandlers(logger: string) {
    // this.loggerToModify = logger;
    this.header_param = { logger: logger };
    this.handlers = [
      { name: 'tst_file', key: 'tst_file' },
      { name: 'tst_file2', key: 'tst_file2' },
      { name: 'tst_file3', key: 'tst_file3' },
    ];

    this.choosableHandlers = [];
    this.log.log('definedHandlers', this.definedHandlers);
    for (const key in this.definedHandlers) {
      if (this.definedHandlers.hasOwnProperty(key)) {
        let found = false;
        let parentFound = false;
        if (this.logger.active !== undefined) {
          if (this.logger.active.parent_handlers_names !== undefined) {
            parentFound = this.logger.active.parent_handlers_names.includes(key);
          }
        }
        if (this.logger.handlers !== undefined) {
          found = this.logger.handlers.includes(key);
        }
        let val: boolean[] = [];
        if (!parentFound || this.logger.propagate === false) {
          if (found) {
            val = [true];
          }
        }
        this.choosableHandlers.push({ name: key, key: key, value: val, disabled: parentFound });
      }
    }
    this.choosableHandlers = this.choosableHandlers.sort(function (a, b) {
      if (a.name > b.name) {
        return 1;
      }
      if (a.name === b.name) {
        return 0;
      }
      return -1;
    });

    this.choosableHandlers1 = [];
    this.choosableHandlers2 = [];
    for (let i = 0; i < this.choosableHandlers.length; i++) {
      if (i < Math.round(this.choosableHandlers.length / 2)) {
        this.choosableHandlers1.push(this.choosableHandlers[i]);
      } else {
        this.choosableHandlers2.push(this.choosableHandlers[i]);
      }
    }
    this.log.log('choosableHandlers1', this.choosableHandlers1);
    this.log.log('choosableHandlers2', this.choosableHandlers2);

    this.chooseHandlers_display = true;
  }

  doModifyHandlers() {
    this.chooseHandlers_display = false;

    const selectedHandlers: string[] = [];
    for (let i = 0; i < this.choosableHandlers.length; i++) {
      if (this.choosableHandlers[i].value.length > 0) {
        selectedHandlers.push(this.choosableHandlers[i].key);
      }
    }
    this.modifyHandlers.emit(selectedHandlers);
  }

  // ------------------------------------------------------------------------------
  //   functions to support logger deletion
  // ------------------------------------------------------------------------------

  deleteLogger(logger: string) {
    this.loggerToDelete = logger;
    this.delete_param = { logger: logger };
    this.confirmdelete_display = true;
  }

  deleteLoggerConfirm() {
    this.confirmdelete_display = false;
    this.loggerDelete.emit(this.loggerToDelete);
  }

  deleteLoggerAbort() {
    this.confirmdelete_display = false;
    this.loggerToDelete = '';
  }
}
