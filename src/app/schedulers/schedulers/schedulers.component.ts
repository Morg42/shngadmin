import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AppConfigService } from '../../common/services/app-config.service';

import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Bind } from 'primeng/bind';
import { Ripple } from 'primeng/ripple';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { map, tap } from 'rxjs/operators';
import { SchedulerInfo } from '../../common/models/scheduler-info';
import { LogService } from '../../common/services/log.service';
import { SchedulersApiService } from '../../common/services/schedulers-api.service';

@Component({
  selector: 'app-schedulers',
  templateUrl: './schedulers.component.html',
  styleUrls: ['./schedulers.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Bind, Tabs, TabList, Ripple, Tab, TabPanels, TabPanel, TranslatePipe],
})
export class SchedulersComponent implements OnInit {
  private dataService = inject(SchedulersApiService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private appConfig = inject(AppConfigService);
  private readonly log = inject(LogService);

  /** AppConfigService.developerMode is only populated once getServerinfo()
   *  resolves (can race a deep-linked navigation here) - a signal off
   *  config$ keeps the dev-only columns reactive under OnPush, matching
   *  plugin-config.component.ts's fix for the same race. */
  readonly developerMode = toSignal(this.appConfig.config$.pipe(map((cfg) => cfg.developerMode)), {
    initialValue: false,
  });

  /** Raw scheduler list as a signal; the API service returns of({}) on
   *  error, so normalize anything non-array to an empty list. */
  private readonly rawSchedulerinfo = toSignal(
    this.dataService.getSchedulers().pipe(
      tap((response) => this.log.log('getSchedulers', { response })),
      map((response) => (Array.isArray(response) ? (response as SchedulerInfo[]) : [])),
    ),
    { initialValue: [] as SchedulerInfo[] },
  );

  readonly sortField = signal('');
  readonly sortOrder = signal<1 | -1>(1);

  /** Sorted view - pure computed over a copy, never an in-place mutation. */
  readonly schedulerinfo = computed(() => {
    const list = this.rawSchedulerinfo();
    const field = this.sortField();
    if (!field) {
      return list;
    }
    const ord = this.sortOrder();
    return [...list].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      const bv = String((b as unknown as Record<string, unknown>)[field] ?? '').toLowerCase();
      return av < bv ? -ord : av > bv ? ord : 0;
    });
  });

  readonly itemSchedulers = computed(() => this.schedulerinfo().filter((s) => s.group === 'item'));
  readonly logicSchedulers = computed(() =>
    this.schedulerinfo().filter((s) => s.group === 'logic'),
  );
  readonly pluginSchedulers = computed(() =>
    this.schedulerinfo().filter((s) => s.group === 'plugin'),
  );
  readonly otherSchedulers = computed(() =>
    this.schedulerinfo().filter((s) => s.group === 'other'),
  );
  readonly triggerSchedulers = computed(() =>
    this.schedulerinfo().filter((s) => s.group === 'trigger'),
  );

  sortBy(field: string): void {
    this.sortOrder.set(this.sortField() === field ? (this.sortOrder() === 1 ? -1 : 1) : 1);
    this.sortField.set(field);
  }

  ngOnInit() {
    this.log.log('SchedulersComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('MENU.SCHEDULERS'));
  }
}
