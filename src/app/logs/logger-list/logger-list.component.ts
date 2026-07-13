import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

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
import { LoggersApiResponse, LoggersType } from '../../common/models/loggers-info';
// LoggersType is used for the loggers field type below
import { LogService } from '../../common/services/log.service';
import { LoggersApiService } from '../../common/services/loggers-api.service';
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
  private dataService = inject(LoggersApiService);
  protected router = inject(Router);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);

  /** Emits to re-fetch the logger list (after create/delete/modify). */
  private readonly refresh$ = new Subject<void>();

  /** Fetches once on construction and again on every refresh$ emission;
   *  responses without a loggers key (error shape) are dropped so the last
   *  good state stays on screen. */
  private readonly loggersResponse = toSignal(
    merge(of(undefined), this.refresh$).pipe(
      switchMap(() => this.dataService.getLoggers()),
      filter((r): r is LoggersApiResponse => !!r && typeof r === 'object' && 'loggers' in r),
    ),
    {
      initialValue: {
        loggers: {} as LoggersType,
        active_plugins: [],
        active_logics: [],
        defined_handlers: [],
      } as LoggersApiResponse,
    },
  );

  readonly loggers = computed(() => this.loggersResponse().loggers);
  readonly active_plugins = computed(() => this.loggersResponse().active_plugins);
  readonly active_logics = computed(() => this.loggersResponse().active_logics);
  readonly loggersList = computed(() => Object.keys(this.loggers()).sort());
  readonly definedHandlers = computed(() => this.loggersResponse().defined_handlers);

  loggerOptions: {}[] = [];

  readonly newlogger_display = signal(false);
  newlogger_name: string = '';
  newlogger_filename: string = '';
  readonly newlogger_add_enabled = signal(false);
  readonly noLoggerToAdd = signal(false);

  levelDefault: string = '?';

  ngOnInit() {
    this.log.log('LoggerListComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('MENU.LOGGER_CONFIGURATION'));
  }

  private refreshLoggers() {
    this.refresh$.next();
  }

  baseName(str: string, withExtension = true) {
    let base = str;
    base = base.substring(base.lastIndexOf('/') + 1);
    if (!withExtension && base.lastIndexOf('.') !== -1) {
      base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
  }

  levelChanged(logger: string, level: string | null) {
    if (level === null) {
      this.loggers()[logger].active.level = this.levelDefault;
    }
    this.log.log(
      "levelChanged: Logger '" + logger + "' from ",
      this.loggers()[logger].level + ' to ' + level,
    );
    this.loggers()[logger].level = this.loggers()[logger].active.level;

    this.dataService
      .setLoggerLevel(logger, level ?? '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp = response as Record<string, unknown>;
        const result = resp['result'];
        const description = resp['description'];
        if (result === 'error') {
          this.log.warn('dataService.setLoggerLevel ERROR', { description });
        }
      });

    this.loggers()[logger].level = this.loggers()[logger].active.level;
  }

  // ------------------------------------------------------------------------------
  //   Logic-logger specific functions
  // ------------------------------------------------------------------------------

  logic_loaded(logger: string) {
    if (logger === 'logics') {
      return true;
    }
    if (logger.startsWith('logics.')) {
      if (this.active_logics().includes(logger.slice(7))) {
        return true;
      }
    }
    return false;
  }

  newLogicLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.active_logics().length; i++) {
      const lg = 'logics.' + this.active_logics()[i];
      if (!this.loggersList().includes(lg) || this.loggers()[lg].not_conf === true) {
        this.loggerOptions.push({ label: lg, value: lg });
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display.set(true);
    this.noLoggerToAdd.set(this.loggerOptions.length === 1);
  }

  // ------------------------------------------------------------------------------
  //   Plugin-logger specific functions
  // ------------------------------------------------------------------------------

  plugin_loaded(logger: string) {
    if (logger === 'plugins') {
      return true;
    }
    if (logger.startsWith('plugins.')) {
      if (this.active_plugins().includes(logger.slice(8).split('.')[0])) {
        return true;
      }
    }
    return false;
  }

  newPluginLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.active_plugins().length; i++) {
      const lg = 'plugins.' + this.active_plugins()[i];
      if (!this.loggersList().includes(lg) || this.loggers()[lg].not_conf === true) {
        this.loggerOptions.push({ label: lg, value: lg });
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display.set(true);
    this.noLoggerToAdd.set(this.loggerOptions.length === 1);
  }

  pluginLoggerIsDeletable(logger: string) {
    if (logger === 'plugins') {
      return false;
    }
    if (logger.startsWith('plugins.')) {
      if (this.loggersList().includes(logger)) {
        return true;
      }
    }
    return false;
  }

  // ------------------------------------------------------------------------------
  //   Item-logger specific functions
  // ------------------------------------------------------------------------------

  newItemLogger() {
    this.log.log('newItemLogger');

    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.loggersList().length; i++) {
      if (this.loggersList()[i].startsWith('items.')) {
        const lg = this.loggersList()[i];
        if (this.loggers()[lg].level === undefined || this.loggers()[lg].not_conf === true) {
          this.loggerOptions.push({ label: lg, value: lg });
        }
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display.set(true);
    this.noLoggerToAdd.set(this.loggerOptions.length === 1);
  }

  // ------------------------------------------------------------------------------
  //   Advanced-logger specific functions
  // ------------------------------------------------------------------------------

  newAdvancedLogger() {
    this.loggerOptions = [{ label: '', value: '' }];
    for (let i = 0; i < this.loggersList().length; i++) {
      if (
        this.loggersList()[i].startsWith('functions.') ||
        this.loggersList()[i].startsWith('lib.') ||
        this.loggersList()[i].startsWith('modules.')
      ) {
        const lg = this.loggersList()[i];
        if (this.loggers()[lg].level === undefined || this.loggers()[lg].not_conf === true) {
          this.loggerOptions.push({ label: lg, value: lg });
        }
      }
    }

    this.newlogger_name = '';
    this.newlogger_filename = '';
    this.newlogger_display.set(true);
    this.noLoggerToAdd.set(this.loggerOptions.length === 1);
  }

  // ------------------------------------------------------------------------------
  //   Functions for all loggers
  // ------------------------------------------------------------------------------

  getParent(logger: string) {
    const parts = logger.split('.');
    parts.pop();
    return parts.join('.');
  }

  newLoggerSelected(loggerOption: string) {
    this.newlogger_add_enabled.set(loggerOption !== '');
  }

  createLogger() {
    this.newlogger_display.set(false);

    this.dataService
      .addLogger(this.newlogger_name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp = response as Record<string, unknown>;
        const result = resp['result'];
        const description = resp['description'];
        if (result === 'error') {
          this.log.warn('dataService.addLogger ERROR', { description });
        }

        if (result === 'ok') this.refreshLoggers();
      });
  }

  loggerDelete(loggerName: string) {
    // this.log.log('list: loggerDelete', loggerName);

    this.dataService
      .deleteLogger(loggerName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp2 = response as Record<string, unknown>;
        const result = resp2['result'];
        const description = resp2['description'];
        if (result === 'error') {
          this.log.warn('dataService.deleteLogger ERROR', { description });
        }

        if (result === 'ok') this.refreshLoggers();
      });
  }

  modifyHandlers(logger: string, handlers: string[] | string) {
    this.log.log("modifyHandlers: Logger '" + logger + "' " + " to '" + handlers + "'");

    this.dataService
      .setHandlers(logger, Array.isArray(handlers) ? handlers.join(',') : handlers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        const resp3 = response as Record<string, unknown>;
        const result = resp3['result'];
        const description = resp3['description'];
        if (result === 'error') {
          this.log.warn('dataService.setHandlers ERROR', { description });
        }

        if (result === 'ok') this.refreshLoggers();
      });
  }
}
