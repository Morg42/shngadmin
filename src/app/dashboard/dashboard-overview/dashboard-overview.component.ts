import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, faPauseCircle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subject, merge, timer } from 'rxjs';
import { map, scan, switchMap, tap } from 'rxjs/operators';
import { MemlogEntry, MemlogResponse } from '../../common/models/memlog-entry';
import { PlugininfoType } from '../../common/models/plugin-info';
import { SchedulerInfo } from '../../common/models/scheduler-info';
import { SystemInfo } from '../../common/models/system-info';
import { ItemsApiService } from '../../common/services/items-api.service';
import { LogService } from '../../common/services/log.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { LogsApiService } from '../../common/services/logs-api.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SchedulersApiService } from '../../common/services/schedulers-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { SharedService } from '../../common/services/shared.service';

/** Both widgets poll on this interval - cheap on the backend since both
 *  sources are already-maintained in-memory state (plugin.alive flags,
 *  the env.core.log ring buffer), not a scan triggered by the request. */
const POLL_INTERVAL_MS = 15000;

const MEMLOG_NAME = 'env.core.log';
const MEMLOG_COUNT = 10;

/** modules/admin/api_sched.py formats scheduler 'next' times as
 *  '%Y-%m-%d %H:%M:%S%z', e.g. '2026-07-28 14:23:05+0200' - a colon-less
 *  offset that native Date() parsing does not reliably support across
 *  browsers, unlike the memlog timestamps elsewhere in this file which
 *  already come colon-separated. Inserting the colon turns it into valid
 *  ISO 8601 before handing it to Date(). Exported for direct unit testing. */
export function parseSchedulerDatetime(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})([+-]\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const [, datePart, timePart, offsetHours, offsetMinutes] = match;
  const date = new Date(`${datePart}T${timePart}${offsetHours}:${offsetMinutes}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** lib/scheduler.py's main loop ticks every 0.5s, so a healthy job's
 *  'next' should never lag behind "now" by more than a second or two.
 *  60s is a generous margin against poll/network/clock-skew noise while
 *  still catching a genuinely stuck scheduler, which lags by minutes. */
const OVERDUE_THRESHOLD_MS = 60000;

/** True if a cyclic/cron scheduler entry is active but its next scheduled
 *  fire time has passed by more than OVERDUE_THRESHOLD_MS - a scheduler
 *  that's still running always advances 'next' after every firing, so a
 *  stale 'next' means the engine stopped processing this job.
 *
 *  'trigger' group entries (one-shot queued triggers dumped from
 *  scheduler._triggerq) have no 'active' field and represent a different
 *  failure mode - a backed-up trigger queue, not a frozen recurring job -
 *  so they're excluded here rather than guessed at. Exported for direct
 *  unit testing. */
export function isOverdueScheduler(entry: SchedulerInfo, nowMs: number): boolean {
  if (entry.group === 'trigger' || entry.active !== true) return false;
  const next = parseSchedulerDatetime(entry.next);
  if (!next) return false;
  return nowMs - next.getTime() > OVERDUE_THRESHOLD_MS;
}

@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, TranslatePipe, RouterLink],
})
export class DashboardOverviewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private pluginsDataService = inject(PluginsApiService);
  private logsDataService = inject(LogsApiService);
  private serverApi = inject(ServerApiService);
  private itemsDataService = inject(ItemsApiService);
  private logicsDataService = inject(LogicsApiService);
  private schedulersDataService = inject(SchedulersApiService);
  private titleService = inject(Title);
  private readonly log = inject(LogService);
  private readonly messageService = inject(MessageService);
  readonly shared = inject(SharedService);

  faPauseCircle = faPauseCircle;
  faExclamationTriangle = faExclamationTriangle;

  // -------------------------------------------------------------------------
  // System status widget: three independent one-shot fetches feeding one
  // card. Each is checked for failure so the widget isn't left silently
  // wrong the way plugins/logs used to be before that was fixed - but
  // ServerApiService.getSystemStats()/ItemsApiService.getItemList()/
  // LogicsApiService.getLogics() are all shared with other pages and their
  // HTTP-error fallback is structurally identical to a legitimate empty
  // response for two of the three (see the per-field comments below), so
  // detecting failure here means a heuristic on "suspiciously empty", not
  // the clean type-based distinction plugins/logs have. Good enough for a
  // one-shot status card; not a guarantee.
  // -------------------------------------------------------------------------

  readonly systemInfoError = signal(false);
  readonly systemInfoLastUpdated = signal<Date | null>(null);

  /** One-shot, same as system.component.ts's own initSystemInfo() - uptime
   *  is a slowly-changing display value, no need to poll it. */
  readonly systemInfo = toSignal(
    this.serverApi.getSystemStats().pipe(
      tap((response) => this.log.log('DashboardOverview getSystemStats', { response })),
      map((response) => response as SystemInfo),
      tap((info) => {
        // getSystemStats()'s HTTP-error fallback is a bare {} - a real
        // response always has every SystemInfo field populated, so "has
        // any recognizable field at all" is a reliable enough check, not
        // just a plausible-but-unverified guess.
        const ok = Object.keys(info).length > 0;
        this.systemInfoError.set(!ok);
        if (ok) this.systemInfoLastUpdated.set(new Date());
      }),
    ),
    { initialValue: {} as SystemInfo },
  );

  readonly shUptimeString = computed(() => {
    const uptime = this.systemInfo().sh_uptime;
    return uptime !== undefined ? this.shared.ageToString(uptime) : '';
  });

  /** Mirrors system.component.html's own pyversion/pyvirtual/pypath display. */
  readonly pythonInfoString = computed(() => {
    const info = this.systemInfo();
    if (!info.pyversion) return '';
    return info.pyvirtual ? `${info.pyversion} (${info.pypath})` : `${info.pyversion} (system)`;
  });

  /** Item/logic counts are static config facts, not "is something wrong"
   *  signals - fetched once like systemInfo, not polled. Both backend
   *  endpoints do real work per call (item list is sorted, logics are read
   *  from logic.yaml), so polling them every 15s would be the scan-on-request
   *  cost this dashboard is otherwise built to avoid. */
  readonly itemCountError = signal(false);
  readonly itemCountLastUpdated = signal<Date | null>(null);

  readonly itemCount = toSignal(
    this.itemsDataService.getItemList().pipe(
      tap((list) => {
        // getItemList()'s HTTP-error fallback is also an empty array, so
        // unlike logicCount below there is no clean signal here - an
        // empty list on a real, actively-configured shng instance is
        // implausible in practice, but a brand new install with zero
        // items configured yet would trip a false positive.
        const ok = Array.isArray(list) && list.length > 0;
        this.itemCountError.set(!ok);
        if (ok) this.itemCountLastUpdated.set(new Date());
      }),
      map((list) => (Array.isArray(list) ? list.length : 0)),
    ),
    { initialValue: 0 },
  );

  readonly logicCountError = signal(false);
  readonly logicCountLastUpdated = signal<Date | null>(null);

  readonly logicCount = toSignal(
    this.logicsDataService.getLogics().pipe(
      tap((response) => {
        // GET /api/logics/ returns { logics, logics_new, groups, ... }, not
        // a bare array - 'logics' is loaded logics only, 'logics_new' is
        // configured-but-not-loaded (disabled) ones. Same logics+logics_new
        // combination logics-groups.component.ts uses for its "all logics"
        // list, so the dashboard count matches what the Logics page shows.
        //
        // Unlike itemCount, this one IS a clean distinction: a real
        // response always has both keys as arrays (even if empty, e.g.
        // genuinely zero logics configured); the {} HTTP-error fallback
        // has neither.
        const data = response as { logics?: unknown[]; logics_new?: unknown[] };
        const ok = Array.isArray(data.logics) || Array.isArray(data.logics_new);
        this.logicCountError.set(!ok);
        if (ok) this.logicCountLastUpdated.set(new Date());
      }),
      map((response) => {
        const data = response as { logics?: unknown[]; logics_new?: unknown[] };
        return (data.logics?.length ?? 0) + (data.logics_new?.length ?? 0);
      }),
    ),
    { initialValue: 0 },
  );

  /** One combined stale indicator for the whole card, rather than three
   *  separate icons for its three independent data sources. */
  readonly systemWidgetError = computed(
    () => this.systemInfoError() || this.itemCountError() || this.logicCountError(),
  );

  readonly systemWidgetLastUpdated = computed(() => {
    const dates = [
      this.systemInfoLastUpdated(),
      this.itemCountLastUpdated(),
      this.logicCountLastUpdated(),
    ].filter((d): d is Date => d !== null);
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  });

  /** Set when the latest poll failed. PluginsApiService already swallows
   *  HTTP errors into `{}` (a non-array) before this pipe ever sees them -
   *  that's still distinguishable from a real (always-array) success
   *  response without touching the shared service other pages depend on. */
  readonly pluginsError = signal(false);
  readonly pluginsLastUpdated = signal<Date | null>(null);

  /** Triggers an immediate re-poll after startPlugin() - the same refresh$
   *  idiom plugins.component.ts uses, so Start feels responsive instead of
   *  waiting for the next POLL_INTERVAL_MS tick. */
  private readonly refreshPlugins$ = new Subject<void>();

  private readonly rawPlugininfo = toSignal(
    merge(timer(0, POLL_INTERVAL_MS), this.refreshPlugins$).pipe(
      switchMap(() => this.pluginsDataService.getPluginsInfo()),
      tap((response) => this.log.log('DashboardOverview getPluginsInfo', { response })),
      // On failure, keep the last-known-good list instead of collapsing to
      // [] - a stale "1 plugin stopped" is more useful than a wrong "0
      // stopped, all fine" while pluginsError() flags it as outdated.
      scan((previous: PlugininfoType[], response: unknown) => {
        const ok = Array.isArray(response);
        this.pluginsError.set(!ok);
        if (!ok) return previous;
        this.pluginsLastUpdated.set(new Date());
        return response as PlugininfoType[];
      }, [] as PlugininfoType[]),
    ),
    { initialValue: [] as PlugininfoType[] },
  );

  readonly pluginsTotal = computed(() => this.rawPlugininfo().length);

  readonly stoppedPlugins = computed(() => this.rawPlugininfo().filter((p) => p.stopped === true));

  /** confignames with a start request in flight - drives the button's
   *  disabled+spinner state for that row specifically, not the whole list. */
  readonly startingPlugins = signal<ReadonlySet<string>>(new Set());

  readonly schedulersError = signal(false);
  readonly schedulersLastUpdated = signal<Date | null>(null);

  private readonly rawSchedulers = toSignal(
    timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.schedulersDataService.getSchedulers()),
      tap((response) => this.log.log('DashboardOverview getSchedulers', { response })),
      scan((previous: SchedulerInfo[], response: unknown) => {
        // getSchedulers()'s HTTP-error fallback is also an empty array -
        // same "suspiciously empty" heuristic as itemCount, since an
        // instance with zero cyclic/cron schedulers is implausible in
        // practice (any item with a cycle/crontab attribute gets one) but
        // not impossible on a bare-minimum install.
        const ok = Array.isArray(response) && response.length > 0;
        this.schedulersError.set(!ok);
        if (!ok) return previous;
        this.schedulersLastUpdated.set(new Date());
        return response as SchedulerInfo[];
      }, [] as SchedulerInfo[]),
    ),
    { initialValue: [] as SchedulerInfo[] },
  );

  /** Recomputed each time rawSchedulers() changes (i.e. once per poll) -
   *  Date.now() itself isn't reactive, but that's fine here: the whole
   *  point is a check every POLL_INTERVAL_MS, not a continuously ticking
   *  clock. */
  readonly overdueSchedulers = computed(() => {
    const nowMs = Date.now();
    return this.rawSchedulers().filter((s) => isOverdueScheduler(s, nowMs));
  });

  readonly logsError = signal(false);
  readonly logsLastUpdated = signal<Date | null>(null);

  readonly memlogEntries = toSignal(
    timer(0, POLL_INTERVAL_MS).pipe(
      switchMap(() => this.logsDataService.getMemlogTail(MEMLOG_NAME, MEMLOG_COUNT)),
      tap((response) => this.log.log('DashboardOverview getMemlogTail', { response })),
      scan((previous: MemlogEntry[], response: MemlogResponse | null) => {
        this.logsError.set(response === null);
        if (response === null) return previous;
        this.logsLastUpdated.set(new Date());
        return response.entries ?? [];
      }, [] as MemlogEntry[]),
    ),
    { initialValue: [] as MemlogEntry[] },
  );

  ngOnInit() {
    this.log.log('DashboardOverviewComponent.ngOnInit');
    this.titleService.setTitle(this.translate.instant('MENU.DASHBOARD'));
  }

  levelClass(level: string): string {
    return level === 'ERROR' || level === 'CRITICAL' ? 'shng-status-error' : 'shng-status-warning';
  }

  /** Same action plugins.component.ts's Start button performs - reused here
   *  so a stopped plugin can be restarted right from the dashboard without
   *  a trip to /plugins first.
   *
   *  Button shows a spinner while the request is in flight. On success the
   *  row disappears on its own once the refetch confirms it's running - no
   *  extra feedback needed, the absence is the confirmation. On failure, a
   *  toast (same pattern PluginsApiService's addPluginConfig/setPluginConfig
   *  already use) rather than any row-color change - this row's red icon
   *  already means "stopped", reusing it as a "did this action fail" signal
   *  would collide with that. */
  startPlugin(configname: string): void {
    this.startingPlugins.update((s) => new Set(s).add(configname));

    this.pluginsDataService
      .setPluginState(configname, 'start')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        this.startingPlugins.update((s) => {
          const next = new Set(s);
          next.delete(configname);
          return next;
        });
        if (success === true) {
          this.refreshPlugins$.next();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('PLUGIN.START'),
            detail: this.translate.instant('DASHBOARD.START_FAILED', { name: configname }),
            sticky: true,
          });
        }
      });
  }

  private formatTime(date: Date): string {
    return [date.getHours(), date.getMinutes(), date.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
  }

  /** Tooltip text for the stale-data warning icon shown in a widget's header
   *  when its latest poll failed. */
  staleTooltip(lastUpdated: Date | null): string {
    if (!lastUpdated) {
      return this.translate.instant('DASHBOARD.NEVER_LOADED');
    }
    return this.translate.instant('DASHBOARD.STALE_DATA', { time: this.formatTime(lastUpdated) });
  }

  /** Entry time strings arrive as '2025-03-01 10:36:52.201055+02:00' (see
   *  SharedService.displayDateTime's docstring for the same format). Compares
   *  against systemInfo().now - the server's own clock - rather than the
   *  browser's local date, so this stays correct if admin and server are in
   *  different timezones. */
  private isToday(datetime: string): boolean {
    const today = this.systemInfo().now;
    if (!today) return false;
    return datetime.split(' ')[0] === today.split(' ')[0];
  }

  /** Same-day entries (the common case for a 10-entry WARNING+ tail) show
   *  time only, no date, no tz offset - all in server-local time already,
   *  repeating that on every row is noise. Fractional seconds are always
   *  dropped, matching displayDateTime()'s precision elsewhere in the app. */
  memlogTimeDisplay(datetime: string): string {
    if (!datetime) return '';
    const [datePart, rest] = datetime.split(' ');
    const timePart = (rest ?? '').split('.')[0];
    if (this.isToday(datetime)) {
      return timePart;
    }
    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year} ${timePart}`;
  }

  /** Overdue entries are, by construction, always in the recent past
   *  (OVERDUE_THRESHOLD_MS), so unlike memlogTimeDisplay there's no
   *  same-day/different-day case to handle - just format the already-
   *  parsed Date in local time. */
  schedulerNextDisplay(next: string): string {
    const date = parseSchedulerDatetime(next);
    return date ? this.formatTime(date) : next;
  }
}
