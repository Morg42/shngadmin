import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
import { LogicsGroupsComponent } from './logics-groups.component';

describe('LogicsGroupsComponent', () => {
  let component: LogicsGroupsComponent;
  let fixture: ComponentFixture<LogicsGroupsComponent>;

  const mockLogicsResponse = {
    logics: [
      { name: 'alpha', group: ['heating'] },
      { name: 'beta', group: 'heating' },
      { name: 'gamma', group: [''] },
    ],
    logics_new: [{ name: 'delta', group: null }],
    groups: {
      heating: { title: 'Heating', description: 'heat stuff' },
      empty: { title: '', description: '' },
    },
    unknown_groups: { ghost: ['alpha'] },
  };

  const mockLogicsApi = {
    getLogics: () => of(mockLogicsResponse),
    saveLogicGroup: () => of({}),
    deleteLogicGroup: () => of({}),
  };

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [LogicsGroupsComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: LogicsApiService, useValue: mockLogicsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        MessageService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(LogicsGroupsComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LogicsGroupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a sorted group menu from the groups response', () => {
    expect(component.groupList()).toEqual(['empty', 'heating']);
    expect(component.menuGroupList().map((i) => i.value)).toEqual(['empty', 'heating']);
  });

  it('merges loaded and unloaded logics into allLogics, name-sorted', () => {
    expect(component.allLogics.map((l) => l.name)).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });

  it('exposes unknown group names', () => {
    expect(component.unknownGroupNames()).toEqual(['ghost']);
  });

  it('groupSelected() splits members by group membership (array and string group fields)', () => {
    component.selectedGroup.set({ label: 'heating', value: 'heating' });
    component.groupSelected();
    expect(component.membersInGroup().map((l) => l.name)).toEqual(['alpha', 'beta']);
    expect(component.membersAvailable().map((l) => l.name)).toEqual(['delta', 'gamma']);
    expect(component.groupChanged()).toBe(false);
  });

  it('checkInput() rejects existing group names case-insensitively', () => {
    component.newGroupname = 'HEATING';
    component.checkInput();
    expect(component.add_enabled).toBe(false);

    component.newGroupname = 'cooling';
    component.checkInput();
    expect(component.add_enabled).toBe(true);
  });

  it('mergePreviewParams computes the member union', () => {
    component.selectedGroup.set({ label: 'empty', value: 'empty' });
    component.groupSelected();
    // 'empty' group has no members; merging into 'heating' adds nothing new
    component.mergeTargetName.set('heating');
    expect(component.mergePreviewParams).toEqual({
      added: 0,
      target: 'heating',
      before: 2,
      after: 2,
    });
  });
});
