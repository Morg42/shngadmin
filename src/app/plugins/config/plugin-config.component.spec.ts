import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of } from 'rxjs';
import fixtureData from '../../../testing/fixtures/api/plugins/config/default.json';
import {
  createMockAppConfigService,
  createMockAuthService,
  translateTestingModule,
} from '../../../testing/test-helpers';
import { AppConfigService } from '../../common/services/app-config.service';
import { AuthService } from '../../common/services/auth.service';
import { PluginsApiService } from '../../common/services/plugins-api.service';
import { ServerApiService } from '../../common/services/server-api.service';
import { UserPreferencesService } from '../../common/services/user-preferences.service';
import { PluginConfigComponent } from './plugin-config.component';

describe('PluginConfigComponent', () => {
  let component: PluginConfigComponent;
  let fixture: ComponentFixture<PluginConfigComponent>;

  const pluginConfigKeys = Object.keys(fixtureData.plugin_config);

  const mockPluginsApi = {
    getPluginsConfig: () => of(fixtureData),
    setPluginConfig: () => of(true),
    setPluginState: () => of(true),
    getInstalledPlugins: () => of({}),
    addPluginConfig: () => of(true),
    deletePluginConfig: () => of(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PluginConfigComponent, translateTestingModule],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: AppConfigService, useValue: createMockAppConfigService() },
        // AppComponent is declared as a component provider and injects these
        {
          provide: ServerApiService,
          useValue: { getServerBasicinfo: () => of({}), getServerinfo: () => of({}) },
        },
        {
          provide: UserPreferencesService,
          useValue: { setLanguage: () => {}, getLanguage: () => null },
        },
        Renderer2,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(PluginConfigComponent, {
        set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PluginConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set spinner_display to false after loading', () => {
    // finalize() from reloadPluginList sets spinner_display=false synchronously
    expect(component.spinner_display).toBe(false);
  });

  it('should set pluginconflist from fixture data', () => {
    // pluginconflist is populated in the subscribe callback
    expect(component.pluginconflist).toBeTruthy();
    expect(component.pluginconflist.readonly).toBe(fixtureData.readonly);
  });

  it('should set up cols with 6 column definitions', () => {
    // cols is set in ngOnInit after reloadPluginList
    expect(component.cols.length).toBe(6);
  });

  // -------------------------------------------------------------------------
  // Filter: onFilterChange, clearFilter, filteredPlugins
  // (configuredplugins is seeded manually so filter tests are independent
  //  of ngOnInit's data-loading and final reset)
  // -------------------------------------------------------------------------

  const makePlugin = (confname: string, plugin: string, instance = '', desc = '') =>
    ({
      confname,
      plugin,
      instance,
      desc,
      loaded: true,
      enabled: 'true',
    }) as import('./plugin-config.component').ConfiguredPlugin;

  it('filterText starts empty', () => {
    expect(component.filterText).toBe('');
  });

  it('onFilterChange() sets filterText', () => {
    component.onFilterChange('backend');
    expect(component.filterText).toBe('backend');
  });

  it('clearFilter() resets filterText to empty string', () => {
    component.filterText = 'backend';
    component.clearFilter();
    expect(component.filterText).toBe('');
  });

  it('filteredPlugins returns all plugins when filterText is empty', () => {
    component.configuredplugins = [makePlugin('backend', '-backend'), makePlugin('cli', '-cli')];
    component.filterText = '';
    expect(component.filteredPlugins.length).toBe(2);
  });

  it('filteredPlugins filters by confname (case-insensitive)', () => {
    component.configuredplugins = [makePlugin('backend', '-backend'), makePlugin('cli', '-cli')];
    component.onFilterChange('back');
    const results = component.filteredPlugins;
    expect(results.length).toBe(1);
    expect(results[0].confname).toBe('backend');
  });

  it('filteredPlugins filters by plugin field', () => {
    component.configuredplugins = [
      makePlugin('myconf', '-myplugin'),
      makePlugin('other', '-other'),
    ];
    component.onFilterChange('myplugin');
    expect(component.filteredPlugins.length).toBe(1);
    expect(component.filteredPlugins[0].confname).toBe('myconf');
  });

  it('filteredPlugins filters by desc field', () => {
    component.configuredplugins = [
      makePlugin('a', '-x', '', 'home automation'),
      makePlugin('b', '-y', '', 'weather'),
    ];
    component.onFilterChange('weather');
    expect(component.filteredPlugins.length).toBe(1);
    expect(component.filteredPlugins[0].confname).toBe('b');
  });

  it('filteredPlugins returns empty when no plugin matches', () => {
    component.configuredplugins = [makePlugin('backend', '-backend'), makePlugin('cli', '-cli')];
    component.onFilterChange('zzznomatch');
    expect(component.filteredPlugins.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // addDialogCategorized default and sortBy
  // -------------------------------------------------------------------------

  it('addDialogCategorized defaults to true (categories enabled)', () => {
    expect(component.addDialogCategorized).toBe(true);
  });

  it('sortBy() sorts configuredplugins ascending by the given field', () => {
    component.configuredplugins = [
      makePlugin('z_conf', '-z'),
      makePlugin('a_conf', '-a'),
      makePlugin('m_conf', '-m'),
    ];
    component.sortBy('confname');
    const names = component.configuredplugins.map((p) => p.confname.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it('sortBy() toggles sort direction on second call with same field', () => {
    component.configuredplugins = [
      makePlugin('a_conf', '-a'),
      makePlugin('z_conf', '-z'),
      makePlugin('m_conf', '-m'),
    ];
    component.sortBy('confname');
    const asc = component.configuredplugins.map((p) => p.confname.toLowerCase());
    component.sortBy('confname'); // descending
    const desc = component.configuredplugins.map((p) => p.confname.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortBy() resets to ascending when switching to a different field', () => {
    component.configuredplugins = [makePlugin('a', '-a'), makePlugin('b', '-b')];
    component.sortBy('confname');
    component.sortBy('confname'); // now descending
    component.sortBy('plugin'); // new field → ascending
    expect(component.sortOrder).toBe(1);
  });
});
