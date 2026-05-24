import { UpperCasePipe } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/plugins/info/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { PluginsComponent } from './plugins.component';

describe('PluginsComponent', () => {
  let component: PluginsComponent;
  let fixture: ComponentFixture<PluginsComponent>;

  const mockPluginsApi = {
    getPluginsInfo: () => of(fixtureData),
    setPluginState: () => of({}),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PluginsComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(PluginsComponent, {
        set: { imports: [TranslatePipe, UpperCasePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PluginsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should populate plugininfo with all plugins from fixture', () => {
    expect(component.plugininfo.length).toBe(fixtureData.length);
  });

  it('should set loading to false after data arrives', () => {
    expect(component.loading).toBe(false);
  });

  it('should render one tbody row per plugin', () => {
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(fixtureData.length);
  });

  it('should sort plugins by pluginname+configname', () => {
    // after sort, check first plugin matches alphabetically first entry
    const sorted = [...fixtureData].sort((a, b) => {
      const ka = a.pluginname + a.configname.toLowerCase();
      const kb = b.pluginname + b.configname.toLowerCase();
      return ka > kb ? 1 : kb > ka ? -1 : 0;
    });
    expect(component.plugininfo[0].configname).toBe(sorted[0].configname);
  });

  // -------------------------------------------------------------------------
  // Filter: onFilterChange, clearFilter, filteredPlugins
  // -------------------------------------------------------------------------

  it('filterText starts empty', () => {
    expect(component.filterText).toBe('');
  });

  it('onFilterChange() sets filterText', () => {
    component.onFilterChange('avm');
    expect(component.filterText).toBe('avm');
  });

  it('clearFilter() resets filterText to empty string', () => {
    component.filterText = 'avm';
    component.clearFilter();
    expect(component.filterText).toBe('');
  });

  it('filteredPlugins returns all plugins when filterText is empty', () => {
    component.filterText = '';
    expect(component.filteredPlugins.length).toBe(component.plugininfo.length);
  });

  it('filteredPlugins filters by configname (case-insensitive)', () => {
    // 'avm' appears in configname of two fixture entries (willy_tel, Fritzbox_wz)
    component.onFilterChange('avm');
    const results = component.filteredPlugins;
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (p) =>
          p.configname.toLowerCase().includes('avm') ||
          p.pluginname.toLowerCase().includes('avm') ||
          p.instancename.toLowerCase().includes('avm'),
      ),
    ).toBe(true);
  });

  it('filteredPlugins returns empty array when no plugin matches', () => {
    component.onFilterChange('zzznomatch');
    expect(component.filteredPlugins.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // sortBy: field sorting and direction toggle
  // -------------------------------------------------------------------------

  it('sortBy() sorts plugins ascending by the given field', () => {
    component.sortBy('configname');
    const names = component.plugininfo.map((p) => p.configname.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it('sortBy() toggles sort direction on second call with same field', () => {
    component.sortBy('pluginname');
    const asc = component.plugininfo.map((p) => p.pluginname.toLowerCase());
    component.sortBy('pluginname'); // second call → descending
    const desc = component.plugininfo.map((p) => p.pluginname.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortBy() resets to ascending when switching to a different field', () => {
    component.sortBy('pluginname');
    component.sortBy('pluginname'); // now descending
    component.sortBy('configname'); // new field → ascending again
    expect(component.sortOrder).toBe(1);
  });
});
