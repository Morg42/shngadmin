import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA, Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
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
        MessageService,
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set spinner_display to false after loading', () => {
    // finalize() from reloadPluginList sets spinner_display=false synchronously
    expect(component.spinner_display()).toBe(false);
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
    expect(component.filterText()).toBe('');
  });

  it('onFilterChange() sets filterText', () => {
    component.onFilterChange('backend');
    expect(component.filterText()).toBe('backend');
  });

  it('clearFilter() resets filterText to empty string', () => {
    component.filterText.set('backend');
    component.clearFilter();
    expect(component.filterText()).toBe('');
  });

  it('filteredPlugins returns all plugins when filterText is empty', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('backend', '-backend'),
      makePlugin('cli', '-cli'),
    ]);
    component.filterText.set('');
    expect(component.filteredPlugins().length).toBe(2);
  });

  it('filteredPlugins filters by confname (case-insensitive)', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('backend', '-backend'),
      makePlugin('cli', '-cli'),
    ]);
    component.onFilterChange('back');
    const results = component.filteredPlugins();
    expect(results.length).toBe(1);
    expect(results[0].confname).toBe('backend');
  });

  it('filteredPlugins filters by plugin field', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('myconf', '-myplugin'),
      makePlugin('other', '-other'),
    ]);
    component.onFilterChange('myplugin');
    expect(component.filteredPlugins().length).toBe(1);
    expect(component.filteredPlugins()[0].confname).toBe('myconf');
  });

  it('filteredPlugins filters by desc field', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('a', '-x', '', 'home automation'),
      makePlugin('b', '-y', '', 'weather'),
    ]);
    component.onFilterChange('weather');
    expect(component.filteredPlugins().length).toBe(1);
    expect(component.filteredPlugins()[0].confname).toBe('b');
  });

  it('filteredPlugins returns empty when no plugin matches', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('backend', '-backend'),
      makePlugin('cli', '-cli'),
    ]);
    component.onFilterChange('zzznomatch');
    expect(component.filteredPlugins().length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // sortBy
  // -------------------------------------------------------------------------

  it('sortBy() sorts configuredplugins ascending by the given field', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('z_conf', '-z'),
      makePlugin('a_conf', '-a'),
      makePlugin('m_conf', '-m'),
    ]);
    component.sortBy('confname');
    const names = component.configuredplugins().map((p) => p.confname.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it('sortBy() toggles sort direction on second call with same field', () => {
    component['rawConfiguredplugins'].set([
      makePlugin('a_conf', '-a'),
      makePlugin('z_conf', '-z'),
      makePlugin('m_conf', '-m'),
    ]);
    component.sortBy('confname');
    const asc = component.configuredplugins().map((p) => p.confname.toLowerCase());
    component.sortBy('confname'); // descending
    const desc = component.configuredplugins().map((p) => p.confname.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
  });

  it('sortBy() resets to ascending when switching to a different field', () => {
    component['rawConfiguredplugins'].set([makePlugin('a', '-a'), makePlugin('b', '-b')]);
    component.sortBy('confname');
    component.sortBy('confname'); // now descending
    component.sortBy('plugin'); // new field → ascending
    expect(component.sortOrder()).toBe(1);
  });

  // -------------------------------------------------------------------------
  // buildConfiguredPlugins: running derived from _running (informational only
  // here - start/stop control lives on the /plugins page)
  // -------------------------------------------------------------------------

  it('derives running/loaded from the fixture for a loaded+running plugin (backend)', () => {
    const backend = component.configuredplugins().find((p) => p.confname === 'backend')!;
    expect(backend.loaded).toBe(true);
    expect(backend.running).toBe(true);
  });

  it('derives running/loaded from the fixture for a loaded+stopped plugin (cli)', () => {
    const cli = component.configuredplugins().find((p) => p.confname === 'cli')!;
    expect(cli.loaded).toBe(true);
    expect(cli.running).toBe(false);
  });

  it('defaults running/loaded to false for an unloaded plugin (develop)', () => {
    const develop = component.configuredplugins().find((p) => p.confname === 'develop')!;
    expect(develop.loaded).toBe(false);
    expect(develop.running).toBe(false);
  });

  // -------------------------------------------------------------------------
  // loadPlugin/unloadPlugin/reloadPlugin
  // -------------------------------------------------------------------------

  it('loadPlugin() short-circuits with a disabled-specific toast, no API call, for a disabled plugin', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');
    const messageService = TestBed.inject(MessageService);
    const addSpy = jest.spyOn(messageService, 'add');
    const row = makePlugin('cli', '-cli');
    row.enabled = 'false';

    component.loadPlugin(row);

    expect(setPluginState).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: expect.any(String),
        detail: 'cli',
        sticky: true,
      }),
    );
  });

  it('loadPlugin() calls setPluginState with "load" for an enabled plugin', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');
    const row = makePlugin('cli', '-cli');
    row.enabled = 'true';

    component.loadPlugin(row);

    expect(setPluginState).toHaveBeenCalledWith('cli', 'load');
  });

  it('unloadPlugin() calls setPluginState with "unload"', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');

    component.unloadPlugin('backend');

    expect(setPluginState).toHaveBeenCalledWith('backend', 'unload');
  });

  it('_runLifecycleAction shows a sticky error toast on failure', () => {
    const setPluginState = jest
      .spyOn(mockPluginsApi, 'setPluginState')
      .mockReturnValueOnce(of(false));
    const messageService = TestBed.inject(MessageService);
    const addSpy = jest.spyOn(messageService, 'add');

    component.reloadPlugin('cli');

    expect(setPluginState).toHaveBeenCalledWith('cli', 'reload');
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'cli', sticky: true }),
    );
  });

  // -------------------------------------------------------------------------
  // Delete confirm dropdown
  // -------------------------------------------------------------------------

  it('deleteActionOptions only offers "keep" when the plugin is not loaded', () => {
    component.rowclicked_foredit = makePlugin('x', '-x');
    component.rowclicked_foredit.loaded = false;
    expect(component.deleteActionOptions.map((o) => o.value)).toEqual(['keep']);
  });

  it('deleteActionOptions offers "keep" and "unload" but not "stop" when loaded but not running, labeling "keep" as loaded (not running)', () => {
    component.rowclicked_foredit = makePlugin('x', '-x');
    component.rowclicked_foredit.loaded = true;
    component.rowclicked_foredit.running = false;
    expect(component.deleteActionOptions.map((o) => o.value)).toEqual(['keep', 'unload']);
    expect(component.deleteActionOptions[0].label).toBe('PLUGIN.DELETE_KEEP_LOADED');
  });

  it('deleteActionOptions offers all three choices when loaded and running, labeling "keep" as running', () => {
    component.rowclicked_foredit = makePlugin('x', '-x');
    component.rowclicked_foredit.loaded = true;
    component.rowclicked_foredit.running = true;
    expect(component.deleteActionOptions.map((o) => o.value)).toEqual(['keep', 'stop', 'unload']);
    expect(component.deleteActionOptions[0].label).toBe('PLUGIN.DELETE_KEEP_RUNNING');
  });

  it('showDeleteActionDropdown is false when not loaded, true when loaded', () => {
    component.rowclicked_foredit = makePlugin('x', '-x');
    component.rowclicked_foredit.loaded = false;
    expect(component.showDeleteActionDropdown).toBe(false);

    component.rowclicked_foredit.loaded = true;
    expect(component.showDeleteActionDropdown).toBe(true);
  });

  it('DeleteConfig() defaults deleteAction to "unload" when loaded, "keep" when not', () => {
    component.dialog_configname = 'x';
    component.rowclicked_foredit = makePlugin('x', '-x');
    component.rowclicked_foredit.loaded = true;
    component.DeleteConfig();
    expect(component.deleteAction()).toBe('unload');

    component.rowclicked_foredit.loaded = false;
    component.DeleteConfig();
    expect(component.deleteAction()).toBe('keep');
  });

  it('deleteConfigFromRow() sets up the same state as DeleteConfig() would from the dialog, without opening it', () => {
    const row = makePlugin('x', '-x');
    row.loaded = true;

    component.deleteConfigFromRow(row);

    expect(component.dialog_configname).toBe('x');
    expect(component.rowclicked_foredit).toBe(row);
    expect(component.confirmdelete_display).toBe(true);
    expect(component.deleteAction()).toBe('unload');
  });

  it('DeleteConfigConfirm() deletes without a pre-action when "keep" is chosen', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');
    const deletePluginConfig = jest.spyOn(mockPluginsApi, 'deletePluginConfig');
    component.dialog_configname = 'x';
    component.deleteAction.set('keep');

    component.DeleteConfigConfirm();

    expect(setPluginState).not.toHaveBeenCalled();
    expect(deletePluginConfig).toHaveBeenCalledWith('x');
  });

  it('DeleteConfigConfirm() stops before deleting when "stop" is chosen', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');
    component.dialog_configname = 'x';
    component.deleteAction.set('stop');

    component.DeleteConfigConfirm();

    expect(setPluginState).toHaveBeenCalledWith('x', 'stop');
  });

  it('DeleteConfigConfirm() unloads before deleting when "unload" is chosen', () => {
    const setPluginState = jest.spyOn(mockPluginsApi, 'setPluginState');
    component.dialog_configname = 'x';
    component.deleteAction.set('unload');

    component.DeleteConfigConfirm();

    expect(setPluginState).toHaveBeenCalledWith('x', 'unload');
  });

  // -------------------------------------------------------------------------
  // rowClicked(): sibling configs for the copy-from dropdown
  // -------------------------------------------------------------------------

  it('rowClicked() finds siblings sharing the same class_path (dreambox_wz/sz/az fixture)', () => {
    const row = component.configuredplugins().find((p) => p.confname === 'dreambox_wz')!;
    component.rowClicked(null, row);

    const siblingNames = component.dialog_siblingConfigs.map((s) => s.confname).sort();
    expect(siblingNames).toEqual(['dreambox_az', 'dreambox_sz']);
  });

  it('rowClicked() finds no siblings for a single-instance plugin', () => {
    const row = component.configuredplugins().find((p) => p.confname === 'backend')!;
    component.rowClicked(null, row);

    expect(component.dialog_siblingConfigs).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // onPluginAdded(): conditional auto-open for configuration
  // -------------------------------------------------------------------------

  it('onPluginAdded() opens the parameter dialog when the plugin has mandatory parameters', () => {
    expect(component.dialog_display()).toBe(false);

    component.onPluginAdded('simulation');

    expect(component.dialog_display()).toBe(true);
    expect(component.dialog_configname).toBe('simulation');
  });

  it('onPluginAdded() does not open the dialog when the plugin has no mandatory parameters', () => {
    component.onPluginAdded('backend');

    expect(component.dialog_display()).toBe(false);
  });
});
