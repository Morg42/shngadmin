import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { Bind } from 'primeng/bind';
import { ButtonDirective } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { Ripple } from 'primeng/ripple';
import { Select } from 'primeng/select';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { LoggersType } from '../../common/models/loggers-info';
import { LoggersApiService } from '../../common/services/loggers-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { LoggerLineComponent } from '../logger-line/logger-line.component';

@Component({
  selector: 'app-logger-list',
  templateUrl: './logger-list.component.html',
  styleUrls: ['./logger-list.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Bind,
    Tabs,
    TabList,
    Ripple,
    Tab,
    TabPanels,
    TabPanel,
    ButtonDirective,
    LoggerLineComponent,
    Dialog,
    PrimeTemplate,
    Select,
    FormsModule,
    Message,
    TranslatePipe,
  ],
})
export class LoggerListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private dataService = inject(LoggersApiService);
  private dataServiceServer = inject(ServerApiService);
  protected router = inject(Router);
  private translate = inject(TranslateService);
  private titleService = inject(Title);

  loggers: LoggersType;
  active_plugins: string[];
  active_logics: string[];
  loggersList: string[] = [];
  definedHandlers: string[] = [];

  loggerOptions: {}[] = [];

  newlogger_display: boolean = false;
  newlogger_name: string = '';
  newlogger_filename: string = '';
  newlogger_add_enabled: boolean = false;
  noLoggerToAdd: boolean = false;
  //  confirmdelete_display: boolean = false;
  //  delete_param: {};

  levelDefault: string = '?';

  public setTitle(newTitle: string) {
    this.titleService.setTitle(newTitle);
  }

  ngOnInit() {
    console.log('LoggerListComponent.ngOnInit');

    this.dataServiceServer
      .getServerinfo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.setTitle(this.translate.instant('MENU.LOGGER_CONFIGURATION'));

        this.dataService
          .getLoggers()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response2: LoggersType) => {
            this.loggers = response2['loggers'];
            this.active_plugins = response2['active_plugins'];
            this.active_logics = response2['active_logics'];
            this.loggersList = Object.keys(response2['loggers']);
            this.loggersList = this.loggersList.sort();
            this.definedHandlers = response2['defined_handlers'];
            console.log('ngOnInit: response2', response2);
            this.cdr.markForCheck();
          });
      });
  }

  baseName(str, withExtension = true) {
    let base = str;
    base = base.substring(base.lastIndexOf('/') + 1);
    if (!withExtension && base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }

  levelChanged(logger, level) {
    if (level === null) {
      this.loggers[logger].active.level = this.levelDefault;
    }
    console.log(
      "levelChanged: Logger '" + logger + "' from ",
      this.loggers[logger].level + ' to ' + level,
    );
    this.loggers[logger].level = this.loggers[logger].active.level;

    this.dataService
      .setLoggerLevel(logger, level)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const result = response['result'];
        const description = response['description'];
        if (result === 'error') {
          console.warn('dataService.setLoggerLevel ERROR', { description });
        }
      });

    this.loggers[logger].level = this.loggers[logger].active.level;
  }

  // ------------------------------------------------------------------------------
  //   Logic-logger specific functions
  // ------------------------------------------------------------------------------

  logic_loaded(logger) {
    if (logger === 'logics') {
      return true;
    }
    if (logger.startsWith('logics.')) {
      if (this.active_logics.includes(logger.slice(7))) {
        return true;
      }
    }
    return false;
  }

  newLogicLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.active_logics.length; i++) {
      const lg = 'logics.' + this.active_logics[i];
      if (!this.loggersList.includes(lg) || this.loggers[lg].not_conf === true) {
        this.loggerOptions.push({ label: lg, value: lg });
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display = true;
    this.noLoggerToAdd = this.loggerOptions.length === 1;
  }

  // ------------------------------------------------------------------------------
  //   Plugin-logger specific functions
  // ------------------------------------------------------------------------------

  plugin_loaded(logger) {
    if (logger === 'plugins') {
      return true;
    }
    if (logger.startsWith('plugins.')) {
      if (this.active_plugins.includes(logger.slice(8).split('.')[0])) {
        return true;
      }
    }
    return false;
  }

  newPluginLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.active_plugins.length; i++) {
      const lg = 'plugins.' + this.active_plugins[i];
      if (!this.loggersList.includes(lg) || this.loggers[lg].not_conf === true) {
        this.loggerOptions.push({ label: lg, value: lg });
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display = true;
    this.noLoggerToAdd = this.loggerOptions.length === 1;
  }

  pluginLoggerIsDeletable(logger) {
    if (logger === 'plugins') {
      return false;
    }
    if (logger.startsWith('plugins.')) {
      if (this.loggersList.includes(logger)) {
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------------------
  //   Item-logger specific functions
  // ------------------------------------------------------------------------------

  newItemLogger() {
    console.log('newItemLogger');

    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.loggersList.length; i++) {
      if (this.loggersList[i].startsWith('items.')) {
        const lg = this.loggersList[i];
        if (this.loggers[lg].level === undefined || this.loggers[lg].not_conf === true) {
          this.loggerOptions.push({ label: lg, value: lg });
        }
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display = true;
    this.noLoggerToAdd = this.loggerOptions.length === 1;
  }

  // ------------------------------------------------------------------------------
  //   Advanced-logger specific functions
  // ------------------------------------------------------------------------------

  newAdvancedLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.loggersList.length; i++) {
      if (
        this.loggersList[i].startsWith('functions.') ||
        this.loggersList[i].startsWith('lib.') ||
        this.loggersList[i].startsWith('modules.')
      ) {
        const lg = this.loggersList[i];
        if (this.loggers[lg].level === undefined || this.loggers[lg].not_conf === true) {
          this.loggerOptions.push({ label: lg, value: lg });
        }
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display = true;
    this.noLoggerToAdd = this.loggerOptions.length === 1;
  }

  // ------------------------------------------------------------------------------
  //   Functions for all loggers
  // ------------------------------------------------------------------------------

  getParent(logger) {
    const parts = logger.split('.');
    parts.pop();
    return parts.join('.');
  }

  newLoggerSelected(loggerOption) {
    this.newlogger_add_enabled = loggerOption !== '';
  }

  createLogger() {
    this.newlogger_display = false;

    this.dataService
      .addLogger(this.newlogger_name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const result = response['result'];
        const description = response['description'];
        if (result === 'error') {
          console.warn('dataService.addLogger ERROR', { description });
        }

        if (result === 'ok') {
          this.dataService
            .getLoggers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2: LoggersType) => {
              this.loggers = response2['loggers'];
              this.active_plugins = response2['active_plugins'];
              this.active_logics = response2['active_logics'];
              this.loggersList = Object.keys(response2['loggers']);
              this.loggersList = this.loggersList.sort();
              this.cdr.markForCheck();
            });
        }
      });
  }

  loggerDelete(loggerName) {
    // console.log('list: loggerDelete', loggerName);

    this.dataService
      .deleteLogger(loggerName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const result = response['result'];
        const description = response['description'];
        if (result === 'error') {
          console.warn('dataService.deleteLogger ERROR', { description });
        }

        if (result === 'ok') {
          this.dataService
            .getLoggers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2: LoggersType) => {
              this.loggers = response2['loggers'];
              this.active_plugins = response2['active_plugins'];
              this.active_logics = response2['active_logics'];
              this.loggersList = Object.keys(response2['loggers']);
              this.loggersList = this.loggersList.sort();
              this.definedHandlers = response2['defined_handlers'];
              console.log('loggerDelete: response2', response2);
              this.cdr.markForCheck();
            });
        }
      });
  }

  modifyHandlers(logger, handlers) {
    console.log("modifyHandlers: Logger '" + logger + "' " + " to '" + handlers + "'");

    this.dataService
      .setHandlers(logger, handlers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const result = response['result'];
        const description = response['description'];
        if (result === 'error') {
          console.warn('dataService.setHandlers ERROR', { description });
        }

        if (result === 'ok') {
          this.dataService
            .getLoggers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response2: LoggersType) => {
              this.loggers = response2['loggers'];
              this.active_plugins = response2['active_plugins'];
              this.active_logics = response2['active_logics'];
              this.loggersList = Object.keys(response2['loggers']);
              this.loggersList = this.loggersList.sort();
              this.definedHandlers = response2['defined_handlers'];
              console.log('loggerDelete: response2', response2);
              this.cdr.markForCheck();
            });
        }
      });
  }
}
