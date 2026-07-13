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
    renameLogic: () => of(true),
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
    expect(component.logics().length).toBe(fixtureData.logics.length);
  });

  it('should separate user logics from system logics', () => {
    expect(component.userlogics().length).toBe(userLogicsCount);
    expect(component.systemlogics().length).toBe(systemLogicsCount);
  });

  it('should load new logics from fixture', () => {
    expect(component.newlogics().length).toBe(fixtureData.logics_new.length);
  });

  it('should build a groupList with at least one group from fixture', () => {
    // fixture has logics with groups: the groupList should be non-empty
    expect(component.groupList().length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Filter: onFilterChange, clearFilter, filteredUserLogics, filteredSysLogics
  // -------------------------------------------------------------------------

  it('filterText starts empty', () => {
    expect(component.filterText()).toBe('');
  });

  it('onFilterChange() sets filterText', () => {
    component.onFilterChange('gate');
    expect(component.filterText()).toBe('gate');
  });

  it('clearFilter() resets filterText to empty string', () => {
    component.filterText.set('gate');
    component.clearFilter();
    expect(component.filterText()).toBe('');
  });

  it('filteredUserLogics returns all user logics when filter is empty', () => {
    component.filterText.set('');
    expect(component.filteredUserLogics().length).toBe(component.userlogics().length);
  });

  it('filteredSysLogics returns all system logics when filter is empty', () => {
    component.filterText.set('');
    expect(component.filteredSysLogics().length).toBe(component.systemlogics().length);
  });

  it('filteredUserLogics filters by logic name (case-insensitive)', () => {
    // fixture contains 'AutomaticGateControlLogicDay' — search for 'gate'
    component.onFilterChange('gate');
    const results = component.filteredUserLogics();
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
    const results = component.filteredUserLogics();
    expect(results.length).toBeGreaterThan(0);
  });

  it('filteredUserLogics returns empty when no logic matches', () => {
    component.onFilterChange('zzznomatch');
    expect(component.filteredUserLogics().length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // sortUserLogics / sortSysLogics: field sorting and direction toggle
  // -------------------------------------------------------------------------

  it('sortUserLogics() sorts user logics ascending by the given field', () => {
    component.sortUserLogics('name');
    const names = component.userlogics().map((l) => l.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it('sortUserLogics() toggles sort direction on second call with same field', () => {
    component.sortUserLogics('name');
    const asc = component.userlogics().map((l) => l.name.toLowerCase());
    component.sortUserLogics('name'); // descending
    const desc = component.userlogics().map((l) => l.name.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortSysLogics() sorts system logics ascending by the given field', () => {
    if (component.systemlogics().length < 2) return; // skip if fixture has <2 sys logics
    component.sortSysLogics('name');
    const names = component.systemlogics().map((l) => l.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  // -------------------------------------------------------------------------
  // Unknown group detection (unknown_groups from API response)
  // -------------------------------------------------------------------------

  it('isUnknownGroup() returns true for group names in unknown_groups', () => {
    // fixture unknown_groups: Group 1, Group 4
    expect(component.isUnknownGroup('Group 1')).toBe(true);
    expect(component.isUnknownGroup('Group 4')).toBe(true);
  });

  it('isUnknownGroup() returns false for defined group names', () => {
    expect(component.isUnknownGroup('Group 2')).toBe(false);
    expect(component.isUnknownGroup('test')).toBe(false);
    expect(component.isUnknownGroup('raeume')).toBe(false);
  });

  it('hasUnknownGroup() returns true when any group of the logic is unknown', () => {
    const logic = component.userlogics().find((l) => l.name === 'AutomaticGateControlLogicDay')!;
    expect(logic).toBeDefined();
    expect(component.hasUnknownGroup(logic)).toBe(true);
  });

  it('hasUnknownGroup() returns false when all groups are defined', () => {
    const logic = component.userlogics().find((l) => l.name === 'CallListCSVLogic')!;
    expect(logic).toBeDefined();
    expect(component.hasUnknownGroup(logic)).toBe(false);
  });

  it('hasUnknownGroup() returns false for a logic with no group', () => {
    const logic = component.userlogics().find((l) => l.name === 'DashbuttonLogics')!;
    expect(logic).toBeDefined();
    expect(component.hasUnknownGroup(logic)).toBe(false);
  });

  it('hasUnknownGroup() returns true when only one of multiple groups is unknown', () => {
    // "test" logic belongs to ["test", "Group 2"] — both defined; none unknown
    const testLogic = component.userlogics().find((l) => l.name === 'test')!;
    expect(component.hasUnknownGroup(testLogic)).toBe(false);

    // Simulate a logic that mixes a defined and an unknown group
    const mixed = { name: 'x', group: ['Group 2', 'Group 4'], userlogic: true };
    expect(component.hasUnknownGroup(mixed as any)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // groupLabel() and getGroupsArray()
  // -------------------------------------------------------------------------

  it('groupLabel() returns comma-separated non-empty group names', () => {
    const logic = component.userlogics().find((l) => l.name === 'test')!;
    // fixture: ["test", "Group 2"]
    expect(component.groupLabel(logic)).toBe('test, Group 2');
  });

  it('groupLabel() returns empty string when group is absent', () => {
    const logic = component.userlogics().find((l) => l.name === 'DashbuttonLogics')!;
    expect(component.groupLabel(logic)).toBe('');
  });

  it('groupLabel() skips empty-string entries', () => {
    const logic = { name: 'x', group: ['', 'Group 2', ''], userlogic: true };
    expect(component.groupLabel(logic as any)).toBe('Group 2');
  });

  it('getGroupsArray() returns non-empty group names as an array', () => {
    const logic = component.userlogics().find((l) => l.name === 'test')!;
    expect(component.getGroupsArray(logic)).toEqual(['test', 'Group 2']);
  });

  it('getGroupsArray() returns empty array when logic has no group', () => {
    const logic = component.userlogics().find((l) => l.name === 'DashbuttonLogics')!;
    expect(component.getGroupsArray(logic)).toEqual([]);
  });

  it('getGroupsArray() filters out empty-string entries', () => {
    const logic = { name: 'x', group: ['', 'Group 2'], userlogic: true };
    expect(component.getGroupsArray(logic as any)).toEqual(['Group 2']);
  });

  // -------------------------------------------------------------------------
  // effectiveExpanded: expand all groups when a filter is active
  // -------------------------------------------------------------------------

  it('effectiveExpanded returns groupExpanded when no filter is set', () => {
    component.filterText.set('');
    component.groupExpanded = [0, 2];
    expect(component.effectiveExpanded).toEqual([0, 2]);
  });

  it('effectiveExpanded returns all group indices when a filter is active', () => {
    component.onFilterChange('gate');
    const expanded = component.effectiveExpanded;
    const expected = component.groupList().map((_, i) => i);
    expect(expanded).toEqual(expected);
  });

  // -------------------------------------------------------------------------
  // groupList includes an unknown flag for groups in unknown_groups
  // -------------------------------------------------------------------------

  it('groupList marks groups in unknown_groups as unknown', () => {
    const g1 = component.groupList().find((g) => g.name === 'Group 1');
    const g4 = component.groupList().find((g) => g.name === 'Group 4');
    expect(g1?.unknown).toBe(true);
    expect(g4?.unknown).toBe(true);
  });

  it('groupList does not mark defined groups as unknown', () => {
    const g2 = component.groupList().find((g) => g.name === 'Group 2');
    const gt = component.groupList().find((g) => g.name === 'test');
    expect(g2?.unknown).toBeFalsy();
    expect(gt?.unknown).toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // Rename dialog: openRenameDialog, renameEnabled, doRename
  // -------------------------------------------------------------------------

  it('openRenameDialog() pre-fills fields and sets rename_display to true', () => {
    component.openRenameDialog('mylogic', 'mylogic.py');
    expect(component.rename_display()).toBe(true);
    expect(component.rename_oldLogicName).toBe('mylogic');
    expect(component.rename_newLogicName).toBe('mylogic');
    expect(component.rename_currentFilename).toBe('mylogic');
    expect(component.rename_newFilename).toBe('mylogic');
  });

  it('openRenameDialog() strips .py extension from currentFilename', () => {
    component.openRenameDialog('mylogic', 'my_file.py');
    expect(component.rename_currentFilename).toBe('my_file');
    expect(component.rename_newFilename).toBe('my_file');
  });

  it('renameEnabled is false when nothing has changed', () => {
    component.openRenameDialog('mylogic', 'mylogic.py');
    expect(component.renameEnabled).toBe(false);
  });

  it('renameEnabled is true when logic name is changed', () => {
    component.openRenameDialog('mylogic', 'mylogic.py');
    component.rename_newLogicName = 'mylogic2';
    expect(component.renameEnabled).toBe(true);
  });

  it('renameEnabled is true when filename is changed', () => {
    component.openRenameDialog('mylogic', 'mylogic.py');
    component.rename_newFilename = 'mylogic2';
    expect(component.renameEnabled).toBe(true);
  });

  it('renameEnabled is false when new name is blank', () => {
    component.openRenameDialog('mylogic', 'mylogic.py');
    component.rename_newLogicName = '  ';
    expect(component.renameEnabled).toBe(false);
  });

  it('doRename() closes dialog and refreshes list on success', () => {
    const getLogicsSpy = jest.spyOn(mockLogicsApi, 'getLogics').mockReturnValue(of(fixtureData));
    component.openRenameDialog('mylogic', 'mylogic.py');
    component.rename_newLogicName = 'mylogic2';
    component.doRename();
    expect(component.rename_display()).toBe(false);
    expect(getLogicsSpy).toHaveBeenCalled();
  });

  it('doRename() keeps dialog open on failure', () => {
    jest.spyOn(mockLogicsApi, 'renameLogic').mockReturnValue(of(false));
    component.openRenameDialog('mylogic', 'mylogic.py');
    component.rename_newLogicName = 'mylogic2';
    component.doRename();
    expect(component.rename_display()).toBe(true);
  });
});
