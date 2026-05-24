import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/logics/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { LogicsListComponent } from './logics-list.component';

describe('LogicsListComponent', () => {
  let component: LogicsListComponent;
  let fixture: ComponentFixture<LogicsListComponent>;

  const userLogicsCount = fixtureData.logics.filter((l) => l.userlogic === true).length;
  const systemLogicsCount = fixtureData.logics.filter((l) => !l.userlogic).length;

  const mockLogicsApi = {
    getLogics: () => of(fixtureData),
    setLogicState: () => of({}),
    groupExpanded: [] as number[],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogicsListComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {}, queryParams: {} },
            queryParams: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogicsListComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogicsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load total logics count from fixture', () => {
    expect(component.logics.length).toBe(fixtureData.logics.length);
  });

  it('should separate user logics from system logics', () => {
    expect(component.userlogics.length).toBe(userLogicsCount);
    expect(component.systemlogics.length).toBe(systemLogicsCount);
  });

  it('should load new logics from fixture', () => {
    expect(component.newlogics.length).toBe(fixtureData.logics_new.length);
  });

  it('should build a groupList with at least one group from fixture', () => {
    // fixture has logics with groups: the groupList should be non-empty
    expect(component.groupList.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Filter: onFilterChange, clearFilter, filteredUserLogics, filteredSysLogics
  // -------------------------------------------------------------------------

  it('filterText starts empty', () => {
    expect(component.filterText).toBe('');
  });

  it('onFilterChange() sets filterText', () => {
    component.onFilterChange('gate');
    expect(component.filterText).toBe('gate');
  });

  it('clearFilter() resets filterText to empty string', () => {
    component.filterText = 'gate';
    component.clearFilter();
    expect(component.filterText).toBe('');
  });

  it('filteredUserLogics returns all user logics when filter is empty', () => {
    component.filterText = '';
    expect(component.filteredUserLogics.length).toBe(component.userlogics.length);
  });

  it('filteredSysLogics returns all system logics when filter is empty', () => {
    component.filterText = '';
    expect(component.filteredSysLogics.length).toBe(component.systemlogics.length);
  });

  it('filteredUserLogics filters by logic name (case-insensitive)', () => {
    // fixture contains 'AutomaticGateControlLogicDay' — search for 'gate'
    component.onFilterChange('gate');
    const results = component.filteredUserLogics;
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (l) =>
          l.name.toLowerCase().includes('gate') ||
          (l.filename ?? '').toLowerCase().includes('gate'),
      ),
    ).toBe(true);
  });

  it('filteredUserLogics filters by filename', () => {
    // fixture contains 'automatic_gate_control_day.py' — search for 'control'
    component.onFilterChange('control');
    const results = component.filteredUserLogics;
    expect(results.length).toBeGreaterThan(0);
  });

  it('filteredUserLogics returns empty when no logic matches', () => {
    component.onFilterChange('zzznomatch');
    expect(component.filteredUserLogics.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // sortUserLogics / sortSysLogics: field sorting and direction toggle
  // -------------------------------------------------------------------------

  it('sortUserLogics() sorts user logics ascending by the given field', () => {
    component.sortUserLogics('name');
    const names = component.userlogics.map((l) => l.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it('sortUserLogics() toggles sort direction on second call with same field', () => {
    component.sortUserLogics('name');
    const asc = component.userlogics.map((l) => l.name.toLowerCase());
    component.sortUserLogics('name'); // descending
    const desc = component.userlogics.map((l) => l.name.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortSysLogics() sorts system logics ascending by the given field', () => {
    if (component.systemlogics.length < 2) return; // skip if fixture has <2 sys logics
    component.sortSysLogics('name');
    const names = component.systemlogics.map((l) => l.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });
});
