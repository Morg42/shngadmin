import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';
import itemListFixture from '../../../testing/fixtures/api/items/list/default.json';
import pluginsFixture from '../../../testing/fixtures/api/plugins/info/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { MemlogResponse } from '../../common/models/memlog-entry';
import { PlugininfoType } from '../../common/models/plugin-info';
import { SchedulerInfo } from '../../common/models/scheduler-info';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ItemsApiService } from '../../common/services/items-api.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { LogsApiService } from '../../common/services/logs-api.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { SchedulersApiService } from '../../common/services/schedulers-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import {
  DashboardOverviewComponent,
  isOverdueScheduler,
  parseSchedulerDatetime,
} from './dashboard-overview.component';

// 'today' per the fixture's own systemInfo().now, not the machine running
// the test - memlogTimeDisplay() must key off that, never wall-clock time.
const SYSTEM_INFO_FIXTURE = {
  node: 'raspi',
  sh_vers: '1.10.2',
  sh_uptime: 3661,
  ostype: 'Linux',
  pyversion: '3.11.2',
  pyvirtual: true,
  pypath: '/opt/shng/venvs/shng',
  now: '2026-07-28 14:00:00.000000+02:00',
};

const LOGICS_FIXTURE = {
  logics: [{ name: 'active_logic' }],
  logics_new: Array.from({ length: 19 }, (_, i) => ({ name: `disabled_${i}` })),
};

/** Builds a scheduler 'next' string in modules/admin/api_sched.py's
 *  '%Y-%m-%d %H:%M:%S%z' format (colon-less offset), in the machine's own
 *  local timezone - matches what parseSchedulerDatetime() expects. */
function formatSchedulerDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${datePart} ${timePart}${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

const SCHEDULERS_FIXTURE: SchedulerInfo[] = [
  {
    group: 'item',
    name: 'healthy.cyclic_job',
    // 5 minutes in the future relative to whenever the test actually runs -
    // deliberately computed, not hardcoded, so this fixture never goes
    // stale into an accidentally-overdue state as time passes.
    next: formatSchedulerDatetime(new Date(Date.now() + 5 * 60 * 1000)),
    cycle: '300',
    cron: '-',
    prio: 3,
    active: true,
    value: 'None',
    by: '',
    task_type: '',
    task_name: '',
  },
];

const MEMLOG_FIXTURE: MemlogResponse = {
  name: 'env.core.log',
  entries: [
    {
      time: '2026-07-28 13:59:00.000000+02:00',
      thread: 'Main',
      level: 'WARNING',
      message: 'today entry',
    },
    {
      time: '2026-07-27 08:00:00.123456+02:00',
      thread: 'Main',
      level: 'ERROR',
      message: 'yesterday entry',
    },
  ],
};

describe('DashboardOverviewComponent', () => {
  let component: DashboardOverviewComponent;
  let fixture: ComponentFixture<DashboardOverviewComponent>;

  const mockPluginsApi = {
    getPluginsInfo: () => of(pluginsFixture),
    // PluginsApiService.setPluginState() already resolves to a boolean by
    // the time a component consumes it - true here mirrors a real success.
    setPluginState: jest.fn(() => of(true)),
  };
  const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
  const mockServerApi = {
    getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
    getDatabaseInfo: () => of({ configured: false }),
  };
  const mockItemsApi = { getItemList: () => of(itemListFixture) };
  const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
  const mockSchedulersApi = { getSchedulers: () => of(SCHEDULERS_FIXTURE) };

  // rawPlugininfo/memlogEntries drive their first fetch through
  // timer(0, POLL_INTERVAL_MS), which schedules via setTimeout even for a
  // 0ms delay - Angular's fakeAsync()/tick() need zone.js, unavailable in
  // this zoneless app, so Jest's own fake timers are used instead (same
  // idiom as system.component.spec.ts's PyPI-poll tests).
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    mockPluginsApi.setPluginState.mockClear();
    jest.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0); // flush the timer(0, ...) first tick
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // System status widget
  // -------------------------------------------------------------------------

  it('loads systemInfo from the one-shot fetch', () => {
    expect(component.systemInfo().node).toBe('raspi');
  });

  it('formats python version with the venv path when pyvirtual is true', () => {
    expect(component.pythonInfoString()).toBe('3.11.2 (/opt/shng/venvs/shng)');
  });

  it('itemCount reflects the flat item-list length', () => {
    expect(component.itemCount()).toBe(itemListFixture.length);
  });

  it('logicCount sums logics + logics_new', () => {
    expect(component.logicCount()).toBe(
      LOGICS_FIXTURE.logics.length + LOGICS_FIXTURE.logics_new.length,
    );
  });

  it('systemWidgetError is false and systemWidgetLastUpdated is set after a healthy load', () => {
    expect(component.systemInfoError()).toBe(false);
    expect(component.itemCountError()).toBe(false);
    expect(component.logicCountError()).toBe(false);
    expect(component.systemWidgetError()).toBe(false);
    expect(component.systemWidgetLastUpdated()).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Schedulers widget
  // -------------------------------------------------------------------------

  it('overdueSchedulers is empty and schedulersError is false when nothing is overdue', () => {
    expect(component.overdueSchedulers()).toEqual([]);
    expect(component.schedulersError()).toBe(false);
    expect(component.schedulersLastUpdated()).not.toBeNull();
  });

  it('schedulerNextDisplay formats a parseable next time as HH:MM:SS', () => {
    const next = formatSchedulerDatetime(new Date(2026, 6, 28, 9, 5, 3));
    expect(component.schedulerNextDisplay(next)).toBe('09:05:03');
  });

  it('schedulerNextDisplay falls back to the raw string when unparseable', () => {
    expect(component.schedulerNextDisplay('garbage')).toBe('garbage');
  });

  // -------------------------------------------------------------------------
  // Plugins widget
  // -------------------------------------------------------------------------

  it('pluginsTotal counts every fixture plugin', () => {
    expect(component.pluginsTotal()).toBe(pluginsFixture.length);
  });

  it('stoppedPlugins keeps only stopped === true entries', () => {
    const stopped = component.stoppedPlugins();
    expect(stopped.length).toBeGreaterThan(0);
    expect(stopped.every((p) => p.stopped === true)).toBe(true);
    expect(stopped.map((p) => p.configname).sort()).toEqual(
      pluginsFixture
        .filter((p: PlugininfoType) => p.stopped === true)
        .map((p: PlugininfoType) => p.configname)
        .sort(),
    );
  });

  it('startPlugin() calls setPluginState with the start action', () => {
    component.startPlugin('smartvisu');
    expect(mockPluginsApi.setPluginState).toHaveBeenCalledWith('smartvisu', 'start');
  });

  it('startPlugin() clears the pending state once the synchronous mock resolves', () => {
    // The mock resolves synchronously, so by the time startPlugin() returns
    // the pending flag has already been set and cleared again - this test
    // exists to pin that startingPlugins never leaks a stuck entry, not to
    // observe the in-flight state itself (see the manual-Subject test below
    // for that).
    component.startPlugin('smartvisu');
    expect(component.startingPlugins().has('smartvisu')).toBe(false);
  });

  it('pluginsError is false after a healthy poll', () => {
    expect(component.pluginsError()).toBe(false);
    expect(component.pluginsLastUpdated()).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // Log widget
  // -------------------------------------------------------------------------

  it('memlogEntries loads from the fixture', () => {
    expect(component.memlogEntries().length).toBe(MEMLOG_FIXTURE.entries.length);
  });

  it('memlogTimeDisplay omits the date for a same-day entry', () => {
    expect(component.memlogTimeDisplay('2026-07-28 13:59:00.000000+02:00')).toBe('13:59:00');
  });

  it('memlogTimeDisplay keeps the date for a different-day entry', () => {
    expect(component.memlogTimeDisplay('2026-07-27 08:00:00.123456+02:00')).toBe(
      '27.07.2026 08:00:00',
    );
  });

  it('memlogTimeDisplay always drops fractional seconds', () => {
    expect(component.memlogTimeDisplay('2026-07-28 13:59:00.123456+02:00')).toBe('13:59:00');
  });

  it('levelClass maps ERROR/CRITICAL to error, everything else to warning', () => {
    expect(component.levelClass('ERROR')).toBe('shng-status-error');
    expect(component.levelClass('CRITICAL')).toBe('shng-status-error');
    expect(component.levelClass('WARNING')).toBe('shng-status-warning');
    expect(component.levelClass('NOTICE')).toBe('shng-status-warning');
  });

  it('logsError is false after a healthy poll', () => {
    expect(component.logsError()).toBe(false);
    expect(component.logsLastUpdated()).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // staleTooltip()
  // -------------------------------------------------------------------------

  it('staleTooltip uses the never-loaded key when nothing succeeded yet', () => {
    expect(component.staleTooltip(null)).toBe('DASHBOARD.NEVER_LOADED');
  });

  it('staleTooltip uses the stale-data key with a last-updated time otherwise', () => {
    expect(component.staleTooltip(new Date())).toBe('DASHBOARD.STALE_DATA');
  });
});

describe('DashboardOverviewComponent error/stale handling', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps last-known-good plugin data and flags pluginsError on a failed poll', async () => {
    jest.useFakeTimers();
    const getPluginsInfo = jest
      .fn()
      .mockReturnValueOnce(of(pluginsFixture))
      .mockReturnValue(of({})); // subsequent polls fail (backend swallows to {})

    const mockPluginsApi = { getPluginsInfo, setPluginState: () => of(true) };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0); // first poll succeeds

    const stoppedBefore = component.stoppedPlugins().length;
    expect(stoppedBefore).toBeGreaterThan(0);
    expect(component.pluginsError()).toBe(false);

    // startPlugin() triggers a second poll via refreshPlugins$, which now fails.
    component.startPlugin('smartvisu');
    fixture.detectChanges();

    expect(component.pluginsError()).toBe(true);
    // Stale data stays visible instead of collapsing to an empty/misleading list.
    expect(component.stoppedPlugins().length).toBe(stoppedBefore);
  });

  it('flags logsError and returns the never-loaded tooltip when the memlog poll fails', async () => {
    jest.useFakeTimers();
    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(null) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0);

    expect(component.logsError()).toBe(true);
    expect(component.memlogEntries().length).toBe(0);
    expect(component.staleTooltip(component.logsLastUpdated())).toBe('DASHBOARD.NEVER_LOADED');
  });

  it('flags systemWidgetError when all three one-shot sources fail', async () => {
    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    // All three mirror their real services' HTTP-error fallback shapes.
    const mockServerApi = {
      getSystemStats: () => of({}),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of([]) };
    const mockLogicsApi = { getLogics: () => of({}) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.systemInfoError()).toBe(true);
    expect(component.itemCountError()).toBe(true);
    expect(component.logicCountError()).toBe(true);
    expect(component.systemWidgetError()).toBe(true);
    expect(component.systemWidgetLastUpdated()).toBeNull();
    expect(component.staleTooltip(component.systemWidgetLastUpdated())).toBe(
      'DASHBOARD.NEVER_LOADED',
    );
  });

  it('systemWidgetLastUpdated reflects the most recent of the sources that did succeed', async () => {
    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    // logicCount fails, the other two succeed - systemWidgetError should
    // still be true (any failure counts), but a last-updated time is
    // available since not everything failed.
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of({}) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.logicCountError()).toBe(true);
    expect(component.systemInfoError()).toBe(false);
    expect(component.itemCountError()).toBe(false);
    expect(component.systemWidgetError()).toBe(true);
    expect(component.systemWidgetLastUpdated()).not.toBeNull();
  });
});

describe('DashboardOverviewComponent with a non-virtualenv Python', () => {
  it('formats python version without a venv path when pyvirtual is false', async () => {
    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of({ ...SYSTEM_INFO_FIXTURE, pyvirtual: false }),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.pythonInfoString()).toBe('3.11.2 (system)');
  });
});

describe('DashboardOverviewComponent startPlugin() feedback', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the pending state while the request is in flight, clears it on success, and refetches', async () => {
    jest.useFakeTimers();
    const setPluginState$ = new Subject<boolean>();
    const getPluginsInfo = jest.fn(() => of(pluginsFixture));
    const mockPluginsApi = { getPluginsInfo, setPluginState: () => setPluginState$.asObservable() };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };
    const messageService = { add: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: messageService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0);

    const callsBefore = getPluginsInfo.mock.calls.length;
    component.startPlugin('smartvisu');

    // Request is in flight - setPluginState$ hasn't emitted yet.
    expect(component.startingPlugins().has('smartvisu')).toBe(true);
    expect(messageService.add).not.toHaveBeenCalled();

    setPluginState$.next(true);
    setPluginState$.complete();

    expect(component.startingPlugins().has('smartvisu')).toBe(false);
    expect(messageService.add).not.toHaveBeenCalled();
    // refreshPlugins$ fired a new poll on success.
    expect(getPluginsInfo.mock.calls.length).toBe(callsBefore + 1);
  });

  it('clears the pending state and shows an error toast when the start action fails', async () => {
    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of(false),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };
    const messageService = { add: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: messageService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.startPlugin('smartvisu');

    expect(component.startingPlugins().has('smartvisu')).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });
});

describe('parseSchedulerDatetime', () => {
  it('parses a colon-less-offset datetime into the correct instant', () => {
    const date = parseSchedulerDatetime('2026-07-28 14:23:05+0200');
    expect(date).not.toBeNull();
    // 14:23:05+02:00 is 12:23:05 UTC
    expect(date!.toISOString()).toBe('2026-07-28T12:23:05.000Z');
  });

  it('handles a negative offset', () => {
    const date = parseSchedulerDatetime('2026-07-28 09:00:00-0500');
    expect(date!.toISOString()).toBe('2026-07-28T14:00:00.000Z');
  });

  it('returns null for an unparseable string', () => {
    expect(parseSchedulerDatetime('not a date')).toBeNull();
    expect(parseSchedulerDatetime('')).toBeNull();
  });
});

describe('isOverdueScheduler', () => {
  const baseEntry: SchedulerInfo = {
    group: 'item',
    name: 'some.job',
    next: '',
    cycle: '300',
    cron: '-',
    prio: 3,
    active: true,
    value: 'None',
    by: '',
    task_type: '',
    task_name: '',
  };

  it('is true for an active entry overdue by more than the threshold', () => {
    const next = formatSchedulerDatetime(new Date(Date.now() - 5 * 60 * 1000)); // 5 min ago
    expect(isOverdueScheduler({ ...baseEntry, next }, Date.now())).toBe(true);
  });

  it('is false for an active entry whose next time is still in the future', () => {
    const next = formatSchedulerDatetime(new Date(Date.now() + 5 * 60 * 1000));
    expect(isOverdueScheduler({ ...baseEntry, next }, Date.now())).toBe(false);
  });

  it('is false within the grace threshold, even if slightly in the past', () => {
    const next = formatSchedulerDatetime(new Date(Date.now() - 10 * 1000)); // 10s ago
    expect(isOverdueScheduler({ ...baseEntry, next }, Date.now())).toBe(false);
  });

  it('is false for an inactive entry, no matter how overdue', () => {
    const next = formatSchedulerDatetime(new Date(Date.now() - 60 * 60 * 1000));
    expect(isOverdueScheduler({ ...baseEntry, next, active: false }, Date.now())).toBe(false);
  });

  it('is false for a trigger-group entry, no matter how overdue', () => {
    const next = formatSchedulerDatetime(new Date(Date.now() - 60 * 60 * 1000));
    expect(isOverdueScheduler({ ...baseEntry, next, group: 'trigger' }, Date.now())).toBe(false);
  });

  it('is false when next cannot be parsed', () => {
    expect(isOverdueScheduler({ ...baseEntry, next: 'garbage' }, Date.now())).toBe(false);
  });
});

describe('DashboardOverviewComponent overdueSchedulers wiring', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('surfaces an actually-overdue active entry end-to-end through the poll', async () => {
    jest.useFakeTimers();
    const overdueEntry: SchedulerInfo = {
      group: 'logic',
      name: 'stuck_logic',
      next: formatSchedulerDatetime(new Date(Date.now() - 10 * 60 * 1000)), // 10 min ago
      cycle: '60',
      cron: '-',
      prio: 3,
      active: true,
      value: 'None',
      by: '',
      task_type: 'logic',
      task_name: "'stuck_logic'",
    };

    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([overdueEntry]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0);

    expect(component.overdueSchedulers().length).toBe(1);
    expect(component.overdueSchedulers()[0].name).toBe('stuck_logic');
  });

  it('does not flag a stopped-but-inactive scheduler even with a past next', async () => {
    jest.useFakeTimers();
    const inactiveEntry: SchedulerInfo = {
      group: 'item',
      name: 'manually.disabled',
      next: formatSchedulerDatetime(new Date(Date.now() - 60 * 60 * 1000)),
      cycle: '300',
      cron: '-',
      prio: 3,
      active: false,
      value: 'None',
      by: '',
      task_type: '',
      task_name: '',
    };

    const mockPluginsApi = {
      getPluginsInfo: () => of(pluginsFixture),
      setPluginState: () => of({}),
    };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of({ configured: false }),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([inactiveEntry]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0);

    expect(component.overdueSchedulers()).toEqual([]);
  });
});

describe('DashboardOverviewComponent database widget', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  /** Only getDatabaseInfo() varies across these tests - every other data
   *  source uses the same minimal fixtures as the main describe block
   *  above, just inlined here since this block doesn't share its
   *  beforeEach(). */
  async function createComponent(
    databaseInfoResponse: unknown,
  ): Promise<DashboardOverviewComponent> {
    jest.useFakeTimers();

    const mockPluginsApi = { getPluginsInfo: () => of([]), setPluginState: () => of(true) };
    const mockLogsApi = { getMemlogTail: () => of(MEMLOG_FIXTURE) };
    const mockServerApi = {
      getSystemStats: () => of(SYSTEM_INFO_FIXTURE),
      getDatabaseInfo: () => of(databaseInfoResponse),
    };
    const mockItemsApi = { getItemList: () => of(itemListFixture) };
    const mockLogicsApi = { getLogics: () => of(LOGICS_FIXTURE) };
    const mockSchedulersApi = { getSchedulers: () => of([]) };

    await TestBed.configureTestingModule({
      imports: [DashboardOverviewComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: LogsApiService, useValue: mockLogsApi },
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: ItemsApiService, useValue: mockItemsApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        { provide: MessageService, useValue: { add: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(DashboardOverviewComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DashboardOverviewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await jest.advanceTimersByTimeAsync(0);
    return component;
  }

  it('reports not configured when no database plugin is loaded', async () => {
    const component = await createComponent({ configured: false });
    expect(component.databaseInfo().configured).toBe(false);
  });

  it('exposes sqlite connection properties, with no host field', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'sqlite3',
      database: 'smarthome',
      connected: true,
      version: '3.45.1',
      query_timeout: 60,
    });

    const info = component.databaseInfo();
    expect(info.driver).toBe('sqlite3');
    expect(info.database).toBe('smarthome');
    expect(info.host).toBeUndefined();
    expect(info.version).toBe('3.45.1');
    expect(info.query_timeout).toBe(60);
  });

  it('exposes host for a MySQL-family driver', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'pymysql',
      database: 'smarthome',
      host: '127.0.0.1',
      connected: true,
      version: '10.11.18-MariaDB',
      query_timeout: 60,
    });

    expect(component.databaseInfo().host).toBe('127.0.0.1');
  });

  it('exposes journal_mode for a sqlite3 driver', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'sqlite3',
      database: 'smarthome',
      connected: true,
      journal_mode: 'wal',
    });

    expect(component.databaseInfo().journal_mode).toBe('wal');
  });

  it('has no journal_mode for a MySQL-family driver', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'pymysql',
      database: 'smarthome',
      host: '127.0.0.1',
      connected: true,
    });

    expect(component.databaseInfo().journal_mode).toBeUndefined();
  });

  it('databaseConnectedClass is the ok class when connected', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'sqlite3',
      connected: true,
    });
    expect(component.databaseConnectedClass()).toBe('shng-status-ok');
  });

  it('databaseConnectedClass is the error class when not connected', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'sqlite3',
      connected: false,
    });
    expect(component.databaseConnectedClass()).toBe('shng-status-error');
  });

  it('exposes reality-checked timescale status for a psycopg driver', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'psycopg2',
      database: 'shng_test',
      host: '127.0.0.1',
      connected: true,
      hypertable: true,
      native_cagg: true,
      // active in the database despite plugin.yaml never configuring it -
      // the case reality-checking exists for.
      native_retention: true,
    });

    const info = component.databaseInfo();
    expect(info.hypertable).toBe(true);
    expect(info.native_cagg).toBe(true);
    expect(info.native_retention).toBe(true);
  });

  it('has no timescale status fields for a MySQL-family driver', async () => {
    const component = await createComponent({
      configured: true,
      driver: 'pymysql',
      database: 'smarthome',
      host: '127.0.0.1',
      connected: true,
    });

    const info = component.databaseInfo();
    expect(info.hypertable).toBeUndefined();
    expect(info.native_cagg).toBeUndefined();
    expect(info.native_retention).toBeUndefined();
  });

  it('tristateLabel maps true/false/null|undefined to YES/NO/UNKNOWN', async () => {
    const component = await createComponent({ configured: false });
    expect(component.tristateLabel(true)).toBe('YES');
    expect(component.tristateLabel(false)).toBe('NO');
    expect(component.tristateLabel(null)).toBe('UNKNOWN');
    expect(component.tristateLabel(undefined)).toBe('UNKNOWN');
  });
});
