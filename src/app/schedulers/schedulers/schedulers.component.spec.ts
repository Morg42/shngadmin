import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/schedulers/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
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
    expect(component.schedulerinfo.length).toBe(fixtureData.length);
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

  it('should render zero trigger rows in fifth tabpanel (no triggers in fixture)', () => {
    const nativeEl: HTMLElement = fixture.nativeElement;
    const tabPanels = nativeEl.querySelectorAll('p-tabpanel');
    const triggerPanel = tabPanels[4];
    const rows = triggerPanel.querySelectorAll('tbody tr');
    // fixture has no schedulers with group==='trigger'
    expect(rows.length).toBe(0);
  });
});
