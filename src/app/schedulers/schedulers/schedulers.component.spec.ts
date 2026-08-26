import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BehaviorSubject, of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/schedulers/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfig, AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { SchedulersApiService } from '../../common/services/schedulers-api.service';
import { SchedulersComponent } from './schedulers.component';

describe('SchedulersComponent', () => {
  let component: SchedulersComponent;
  let fixture: ComponentFixture<SchedulersComponent>;

  const mockSchedulersApi = {
    getSchedulers: () => of(fixtureData),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchedulersComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SchedulersComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SchedulersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all schedulers from fixture into component', () => {
    // fixture has 23 total schedulers: 8 item + 11 logic + 1 plugin + 3 other
    expect(component.schedulerinfo().length).toBe(fixtureData.length);
  });

  it('should render item-group scheduler rows in first tabpanel', () => {
    const nativeEl: HTMLElement = fixture.nativeElement;
    // The first p-tabpanel (value="0") renders item schedulers
    const tabPanels = nativeEl.querySelectorAll('p-tabpanel');
    const itemPanel = tabPanels[0];
    const rows = itemPanel.querySelectorAll('tbody tr');
    const itemSchedulers = fixtureData.filter((s) => s.group === 'item');
    expect(rows.length).toBe(itemSchedulers.length);
  });

  it('should show the first item scheduler name in the first tbody row', () => {
    const nativeEl: HTMLElement = fixture.nativeElement;
    const tabPanels = nativeEl.querySelectorAll('p-tabpanel');
    const itemPanel = tabPanels[0];
    const firstRow = itemPanel.querySelector('tbody tr');
    expect(firstRow).toBeTruthy();
    const firstCell = firstRow!.querySelector('td');
    const firstItemScheduler = fixtureData.filter((s) => s.group === 'item')[0];
    expect(firstCell!.textContent?.trim()).toBe(firstItemScheduler.name);
  });

  it('should render logic-group scheduler rows in second tabpanel', () => {
    const nativeEl: HTMLElement = fixture.nativeElement;
    const tabPanels = nativeEl.querySelectorAll('p-tabpanel');
    const logicPanel = tabPanels[1];
    const rows = logicPanel.querySelectorAll('tbody tr');
    const logicSchedulers = fixtureData.filter((s) => s.group === 'logic');
    expect(rows.length).toBe(logicSchedulers.length);
  });

  it('should render one empty-hint row in fifth tabpanel (no triggers in fixture)', () => {
    const nativeEl: HTMLElement = fixture.nativeElement;
    const tabPanels = nativeEl.querySelectorAll('p-tabpanel');
    const triggerPanel = tabPanels[4];
    const rows = triggerPanel.querySelectorAll('tbody tr');
    // fixture has no trigger schedulers — @empty renders exactly one hint row
    expect(rows.length).toBe(1);
  });
});

describe('SchedulersComponent developer-mode race', () => {
  // Regression test for the bug where developerMode was read once as a plain
  // snapshot at field-initializer time - if getServerinfo() (the async call
  // that patches developerMode in) resolves AFTER this component is
  // constructed, the dev-only columns stayed hidden forever, even though
  // developer mode really is active. Only navigating away and re-constructing
  // the component (a fresh snapshot read) fixed it. Same race, same fix
  // pattern as plugin-config.component.ts.
  const config$ = new BehaviorSubject<AppConfig>({
    loginRequired: null,
    apiUrl: '/api/',
    dataUrl: '',
    hostIp: 'localhost',
    wsHost: 'localhost',
    wsPort: '',
    clientIp: '',
    tz: '',
    tzname: 'CET',
    tznameST: 'CET',
    tznameDST: 'CEST',
    coreBranch: '',
    pluginsBranch: '',
    itemtreeFullpath: true,
    itemtreeSearchstart: 3,
    developerMode: false,
    clickDropdownHeader: true,
    helpLocalAvailable: false,
    darkModeDefault: false,
    resourceGraphPeriod: '24h',
    restartStopsOnly: false,
    fallbackLanguageOrder: ['en', 'de'],
    startPage: 'dashboard',
    defaultLanguage: 'en',
  });

  const mockSchedulersApi = {
    getSchedulers: () => of(fixtureData),
  };

  beforeEach(async () => {
    config$.next({ ...config$.getValue(), developerMode: false });
    await TestBed.configureTestingModule({
      imports: [SchedulersComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SchedulersApiService, useValue: mockSchedulersApi },
        { provide: AuthService, useValue: createMockAuthService() },
        {
          provide: AppConfigService,
          useValue: { ...createMockAppConfigService(), config$: config$.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(SchedulersComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  it('should reveal dev-only columns once developerMode arrives after construction', () => {
    // Component constructed while developerMode is still false (the
    // in-flight-request state a first, cold navigation would see).
    const fixture: ComponentFixture<SchedulersComponent> =
      TestBed.createComponent(SchedulersComponent);
    fixture.detectChanges();

    // p-tabpanel[2] = plugin schedulers, the first tab with dev-mode-gated columns
    let headerCells = fixture.nativeElement
      .querySelectorAll('p-tabpanel')[2]
      .querySelectorAll('thead th');
    // false-branch renders 1 dev-gated header th (crontab only); true-branch renders 3
    const baseColumns = 5; // scheduler/next/prio/parameters/cycle, ungated
    expect(headerCells.length).toBe(baseColumns + 1);

    // getServerinfo() resolves after construction - config$ patches for real.
    config$.next({ ...config$.getValue(), developerMode: true });
    fixture.detectChanges();

    headerCells = fixture.nativeElement
      .querySelectorAll('p-tabpanel')[2]
      .querySelectorAll('thead th');
    expect(headerCells.length).toBe(baseColumns + 3);
  });
});
