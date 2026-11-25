import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { translateTestingModule } from '../../../../testing/test-helpers';
import { PluginsInstalled } from '../../../common/models/plugins-installed';
import { PluginsApiService } from '../../../common/services/plugins-api.service';
import { SharedService } from '../../../common/services/shared.service';
import { AddPluginDialogComponent } from './add-plugin-dialog.component';

describe('AddPluginDialogComponent', () => {
  let component: AddPluginDialogComponent;
  let fixture: ComponentFixture<AddPluginDialogComponent>;
  let mockPluginsApi: { getInstalledPlugins: jest.Mock; addPluginConfig: jest.Mock };

  const installed: PluginsInstalled = {
    hue: {
      type: 'interface',
      description: { en: 'Hue bridge' },
      version: '1.0',
      state: '',
      documentation: '',
      multi_instance: 'true',
      configuration_needed: false,
    },
    knx: {
      type: 'gateway',
      description: { en: 'KNX gateway' },
      version: '1.0',
      state: 'deprecated',
      documentation: '',
      multi_instance: 'false',
      configuration_needed: false,
    },
  };

  const mockSharedService = {
    getDescription: (d: Record<string, string> | null | undefined) => (d ? (d['en'] ?? '') : ''),
  };

  beforeEach(async () => {
    mockPluginsApi = {
      getInstalledPlugins: jest.fn().mockReturnValue(of(installed)),
      addPluginConfig: jest.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [AddPluginDialogComponent, translateTestingModule],
      providers: [
        { provide: PluginsApiService, useValue: mockPluginsApi },
        { provide: SharedService, useValue: mockSharedService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddPluginDialogComponent);
    component = fixture.componentInstance;
  });

  it('loadInstalledPlugins() populates the installed-plugin list and clears loading', () => {
    component.loadInstalledPlugins();
    expect(component.plugins_installed_list()).toEqual(['hue', 'knx']);
    expect(component.plugins_installed()['hue'].disp_description).toBe('Hue bridge');
    expect(component.loading()).toBe(false);
  });

  it('addDialogFilteredList filters by name and description (case-insensitive), sorted', () => {
    component.loadInstalledPlugins();
    expect(component.addDialogFilteredList()).toEqual(['hue', 'knx']);

    component.onAddFilterChange('bridge');
    expect(component.addDialogFilteredList()).toEqual(['hue']);

    component.onAddFilterChange('KNX');
    expect(component.addDialogFilteredList()).toEqual(['knx']);

    component.clearAddFilter();
    expect(component.addDialogFilteredList()).toEqual(['hue', 'knx']);
  });

  it('matchesAddFilter() and hasMatchingPlugins() respect the current filter', () => {
    component.loadInstalledPlugins();
    // 'gateway' matches knx (type 'gateway' AND description 'KNX gateway'), not hue
    component.onAddFilterChange('gateway');
    expect(component.matchesAddFilter('hue')).toBe(false);
    expect(component.matchesAddFilter('knx')).toBe(true);
    expect(component.hasMatchingPlugins('gateway')).toBe(true);
    expect(component.hasMatchingPlugins('interface')).toBe(false);

    component.onAddFilterChange('hue');
    expect(component.matchesAddFilter('hue')).toBe(true);
    expect(component.hasMatchingPlugins('interface')).toBe(true);
  });

  it('selectPlugin() opens the set-config-name step with the plugin pre-filled', () => {
    component.loadInstalledPlugins();
    expect(component.setconfig_display).toBe(false);

    component.selectPlugin('hue');

    expect(component.setconfig_display).toBe(true);
    expect(component.selected_plugin).toBe('hue');
    expect(component.pluginconfig_name).toBe('hue');
  });

  it('checkInput() disables add when the name is empty or already in existingConfigNames', () => {
    fixture.componentRef.setInput('existingConfigNames', ['hue_1']);

    component.pluginconfig_name = '';
    expect(component.checkInput()).toBe(false);

    component.pluginconfig_name = 'hue_1';
    expect(component.checkInput()).toBe(false);

    component.pluginconfig_name = 'hue_2';
    expect(component.checkInput()).toBe(true);
  });

  it('addPlugin() closes both dialogs, posts the config, and emits added on success', () => {
    fixture.componentRef.setInput('existingConfigNames', []);
    component.visible.set(true);
    component.setconfig_display = true;
    component.selected_plugin = 'hue';
    component.pluginconfig_name = 'hue_1';

    const added = jest.fn();
    component.added.subscribe(added);

    component.addPlugin();

    expect(component.setconfig_display).toBe(false);
    expect(component.visible()).toBe(false);
    expect(mockPluginsApi.addPluginConfig).toHaveBeenCalledWith('hue_1', {
      config: { plugin_name: 'hue', plugin_enabled: true },
    });
    expect(added).toHaveBeenCalledWith('hue_1');
  });

  it('addPlugin() does nothing when checkInput() fails (duplicate name)', () => {
    fixture.componentRef.setInput('existingConfigNames', ['hue_1']);
    component.selected_plugin = 'hue';
    component.pluginconfig_name = 'hue_1';

    const added = jest.fn();
    component.added.subscribe(added);

    component.addPlugin();

    expect(mockPluginsApi.addPluginConfig).not.toHaveBeenCalled();
    expect(added).not.toHaveBeenCalled();
  });

  it('addPlugin() does not emit added when the backend reports failure', () => {
    mockPluginsApi.addPluginConfig.mockReturnValue(of(false));
    fixture.componentRef.setInput('existingConfigNames', []);
    component.selected_plugin = 'hue';
    component.pluginconfig_name = 'hue_1';

    const added = jest.fn();
    component.added.subscribe(added);

    component.addPlugin();

    expect(added).not.toHaveBeenCalled();
  });
});
