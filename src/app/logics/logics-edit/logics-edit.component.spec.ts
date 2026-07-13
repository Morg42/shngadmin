import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { LogicsApiService } from '../../common/services/logics-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { LogicsEditComponent } from './logics-edit.component';

describe('LogicsEditComponent', () => {
  let component: LogicsEditComponent;
  let fixture: ComponentFixture<LogicsEditComponent>;

  const mockGroupsResponse = {
    groups: {
      alpha: { title: 'Alpha group', description: '' },
      beta: { title: 'Beta group', description: '' },
      gamma: { title: 'Gamma group', description: '' },
    },
  };

  const mockLogicsApi = {
    getGroupsInfo: () => of(mockGroupsResponse),
    getLogic: () => of({ name: 'testlogic', group: '', enabled: true, logic_description: '' }),
    getLogicState: () => of({}),
    setLogicState: () => of({}),
    saveLogicParameters: () => of({}),
  };

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [LogicsEditComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        MessageService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                params: { logicname: 'testlogic|testfile' },
                get: (key: string) => (key === 'logicname' ? 'testlogic|testfile' : null),
              },
            },
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogicsEditComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogicsEditComponent);
    component = fixture.componentInstance;
    const cmStub = {
      getOption: jest.fn(() => false),
      setSize: jest.fn(),
      refresh: jest.fn(),
      state: { completionActive: false },
      on: jest.fn(),
    };
    (component as any).codeEditor = { codeMirror: cmStub };
    (component as any).codeEditorWatchItems = { codeMirror: cmStub };
    fixture.detectChanges();
    // Override ViewChild after detectChanges so Angular's resolution doesn't overwrite it
    (component as any).groupAutoComplete = () => ({ show: jest.fn() });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // allGroupNames populated from getGroupsInfo()
  // -------------------------------------------------------------------------

  it('allGroupNames is populated from the groups API response', () => {
    expect(component.allGroupNames()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('allGroupNames is sorted alphabetically (case-insensitive)', () => {
    const sorted = [...component.allGroupNames()].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(component.allGroupNames()).toEqual(sorted);
  });

  // -------------------------------------------------------------------------
  // searchGroups(): filter suggestions by query, exclude already-selected chips
  // -------------------------------------------------------------------------

  it('searchGroups() with empty query returns all group names', () => {
    component.logicGroupChips.set([]);
    component.searchGroups({ query: '' });
    expect(component.filteredGroupNames).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('searchGroups() filters by substring (case-insensitive)', () => {
    component.logicGroupChips.set([]);
    component.searchGroups({ query: 'a' });
    // 'alpha', 'beta', 'gamma' all contain 'a'
    expect(component.filteredGroupNames).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('searchGroups() narrows results as query becomes more specific', () => {
    component.logicGroupChips.set([]);
    component.searchGroups({ query: 'alp' });
    expect(component.filteredGroupNames).toEqual(['alpha']);
  });

  it('searchGroups() returns empty array when nothing matches', () => {
    component.logicGroupChips.set([]);
    component.searchGroups({ query: 'zzz' });
    expect(component.filteredGroupNames).toEqual([]);
  });

  it('searchGroups() excludes already-selected chips from suggestions', () => {
    component.logicGroupChips.set(['alpha', 'gamma']);
    component.searchGroups({ query: '' });
    expect(component.filteredGroupNames).toEqual(['beta']);
  });

  // -------------------------------------------------------------------------
  // onGroupFocus(): pre-fills filteredGroupNames excluding current chips
  // -------------------------------------------------------------------------

  it('onGroupFocus() sets filteredGroupNames to unused groups', () => {
    component.logicGroupChips.set(['beta']);
    component.onGroupFocus();
    expect(component.filteredGroupNames).toEqual(['alpha', 'gamma']);
  });

  it('onGroupFocus() with no chips selected returns all groups', () => {
    component.logicGroupChips.set([]);
    component.onGroupFocus();
    expect(component.filteredGroupNames).toEqual(['alpha', 'beta', 'gamma']);
  });

  // -------------------------------------------------------------------------
  // onGroupChipsChange(): syncs logicGroupChips -> logic.group string
  // -------------------------------------------------------------------------

  it('onGroupChipsChange() writes a pipe-separated string to logic.group', () => {
    component.logicGroupChips.set(['alpha', 'beta']);
    component.onGroupChipsChange();
    expect(component.logic().group).toBe('alpha | beta');
  });

  it('onGroupChipsChange() writes empty string when chips are empty', () => {
    component.logicGroupChips.set([]);
    component.onGroupChipsChange();
    expect(component.logic().group).toBe('');
  });

  it('onGroupChipsChange() marks logicChanged when chips differ from original', () => {
    // After fixture loads, logicGroupChips is [] and logicGroupOrig is the original value.
    // Adding a chip that wasn't there before should set logicChanged = true.
    component.logicGroupChips.set(['alpha']);
    component.onGroupChipsChange();
    expect(component.logicChanged()).toBe(true);
  });
});
