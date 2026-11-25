import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { StructsApiService } from '../../common/services/structs-api.service';
import { StructsComponent } from './structs.component';

describe('StructsComponent', () => {
  let component: StructsComponent;
  let fixture: ComponentFixture<StructsComponent>;

  // Two plugin structs (unsorted on purpose) and one user struct without a dot.
  const mockStructs = {
    'viessmann.timer': { name: 'Timer', entry: { type: 'list' } },
    mystruct: { entry: { type: 'num' } },
    'hue.color': { name: 'Color', entry: { type: 'str' } },
  };

  const mockStructsApi = {
    getStructs: () => of(mockStructs),
  };

  beforeEach(async () => {
    const mockServerApi = {
      getServerBasicinfo: () => of({}),
      getServerinfo: () => of({}),
      shng_serverinfo: {},
    };

    await TestBed.configureTestingModule({
      imports: [StructsComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ServerApiService, useValue: mockServerApi },
        { provide: StructsApiService, useValue: mockStructsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(StructsComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(StructsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('structsList is the sorted struct names', () => {
    expect(component.structsList()).toEqual(['hue.color', 'mystruct', 'viessmann.timer']);
  });

  it("structsGroups puts 'my' first, then plugin prefixes in list order", () => {
    expect(component.structsGroups()).toEqual(['my', 'hue', 'viessmann']);
  });

  it('getStructListByGroup returns dotless names for my and prefixed names per plugin', () => {
    expect(component.getStructListByGroup('my')).toEqual(['mystruct']);
    expect(component.getStructListByGroup('viessmann')).toEqual(['viessmann.timer']);
    expect(component.getStructListByGroup('hue')).toEqual(['hue.color']);
  });

  it('builds one display tree per struct', () => {
    expect(Object.keys(component.displayTrees()).sort()).toEqual([
      'hue.color',
      'mystruct',
      'viessmann.timer',
    ]);
    expect(component.displayTrees()['viessmann.timer'].length).toBeGreaterThan(0);
  });

  it('expandAll marks every node expanded and swaps the tree entry', () => {
    const key = 'viessmann.timer';
    const before = component.displayTrees()[key];
    component.expandAll(before, key);
    const after = component.displayTrees()[key];
    expect(after).not.toBe(before);
    const allExpanded = (nodes: { expanded?: boolean; children?: unknown[] }[]): boolean =>
      nodes.every(
        (n) =>
          n.expanded === true &&
          (!n.children || allExpanded(n.children as { expanded?: boolean }[])),
      );
    expect(allExpanded(after)).toBe(true);
  });
});
